import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import {
  requireAuth,
  getCurrentProfile,
  formatPublicProfileIdentity,
  validateTextLength,
  sanitizeText,
  validateRoomHandle,
  validateUrl,
  areFriends,
  acquireUniqueLock,
  releaseUniqueLock,
  MAX_LENGTHS,
  MIN_LENGTHS,
} from "./helpers";
import { checkRateLimit } from "./rateLimiter";
import { Presence } from "@convex-dev/presence";
import { components } from "./_generated/api";

const presence = new Presence(components.presence);

// ============================================
// Room Constants
// ============================================

const MOCK_STREAM_URL =
  "https://virtual-channel.unified-streaming.com/demo_channel-stable.isml/.m3u8";
const JOIN_TOKEN_TTL_MS = 2 * 60 * 1000;
const JAM_SESSION_TTL_MS = 5 * 60 * 1000;

import { ROOM_GENRES } from "./shared";
export { ROOM_GENRES, type RoomGenre } from "./shared";

/** Presence room ID for a jam room */
function roomPresenceId(roomId: string) {
  return `room:${roomId}`;
}

function roomScopeKey(communityId?: Id<"communities">) {
  return communityId ? `community:${communityId}` : "global";
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(payload)
  );
  return toHex(signature);
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function requireRoomAccess(
  ctx: QueryCtx | MutationCtx,
  profile: Doc<"profiles">,
  room: Doc<"rooms">
) {
  if (!room.isActive) throw new Error("ROOM_INACTIVE");
  if (!room.isPrivate || room.hostId === profile._id) return;
  const friends = await areFriends(ctx, profile._id, room.hostId);
  if (!friends) throw new Error("PRIVATE_ROOM");
}

async function getCommunityMembership(
  ctx: QueryCtx | MutationCtx,
  communityId: Id<"communities">,
  profileId: Id<"profiles">
) {
  return await ctx.db
    .query("community_members")
    .withIndex("by_community_and_profile", (q) =>
      q.eq("communityId", communityId).eq("profileId", profileId)
    )
    .first();
}

async function requireCommunityMembership(
  ctx: QueryCtx | MutationCtx,
  communityId: Id<"communities">,
  profileId: Id<"profiles">
) {
  const membership = await getCommunityMembership(ctx, communityId, profileId);
  if (!membership) throw new Error("COMMUNITY_MEMBERSHIP_REQUIRED");
  return membership;
}

async function requirePerformerRoomAccess(
  ctx: QueryCtx | MutationCtx,
  profile: Doc<"profiles">,
  room: Doc<"rooms">
) {
  await requireRoomAccess(ctx, profile, room);
  if (room.communityId) {
    await requireCommunityMembership(ctx, room.communityId, profile._id);
  }
}

async function selectOfficialJamServer(ctx: MutationCtx) {
  const server = await ctx.db
    .query("jam_servers")
    .withIndex("by_kind_status_priority", (q) =>
      q.eq("kind", "official").eq("status", "enabled")
    )
    .order("asc")
    .first();

  if (!server) throw new Error("JAM_SERVER_NOT_CONFIGURED");
  if (!server.joinSecret.trim()) throw new Error("JAM_SERVER_SECRET_MISSING");
  return server;
}

async function selectCommunityJamServer(
  ctx: MutationCtx,
  communityId: Id<"communities">
) {
  const server = await ctx.db
    .query("jam_servers")
    .withIndex("by_community_status", (q) =>
      q.eq("communityId", communityId).eq("status", "enabled")
    )
    .filter((q) => q.eq(q.field("kind"), "community"))
    .first();

  if (!server) throw new Error("COMMUNITY_JAM_SERVER_NOT_CONFIGURED");
  if (!server.joinSecret.trim()) throw new Error("COMMUNITY_JAM_SERVER_SECRET_MISSING");
  return server;
}

async function getActiveJamSession(ctx: MutationCtx, roomId: Id<"rooms">) {
  return await ctx.db
    .query("jam_sessions")
    .withIndex("by_room_status", (q) =>
      q.eq("roomId", roomId).eq("status", "active")
    )
    .first();
}

// ============================================
// Internal Format Helper
// ============================================

async function formatRoom(ctx: QueryCtx | MutationCtx, room: Doc<"rooms">) {
  const host = await ctx.db.get(room.hostId);

  // Get live participant count from presence
  const onlineUsers = await presence.listRoom(
    ctx,
    roomPresenceId(String(room._id)),
    true
  );

  return {
    id: room._id,
    host_id: room.hostId,
    host: host ? formatPublicProfileIdentity(host) : null,
    handle: room.handle,
    name: room.name,
    description: room.description ?? "",
    genre: room.genre ?? null,
    max_performers: room.maxPerformers,
    is_private: room.isPrivate,
    is_active: room.isActive,
    stream_url: room.streamUrl ?? null,
    status: room.status,
    community_id: room.communityId ?? null,
    participant_count: onlineUsers.length,
    last_active_at: new Date(room.lastActiveAt).toISOString(),
    created_at: new Date(room._creationTime).toISOString(),
  };
}

// ============================================
// Queries
// ============================================

/** Get a room by its unique handle */
export const getByHandle = query({
  args: { handle: v.string() },
  handler: async (ctx, args) => {
    const normalizedHandle = args.handle.trim().toLowerCase();
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_handle", (q) => q.eq("handle", normalizedHandle))
      .first();

    if (!room) return null;
    return await formatRoom(ctx, room);
  },
});

/** Get the current user's room (each user can host at most 1) */
export const getMyRoom = query({
  args: {},
  handler: async (ctx) => {
    const currentProfile = await getCurrentProfile(ctx);
    if (!currentProfile) return null;

    const room = await ctx.db
      .query("rooms")
      .withIndex("by_host_scope", (q) =>
        q.eq("hostId", currentProfile._id).eq("scopeKey", "global")
      )
      .first();

    const fallbackRoom =
      room ??
      (await ctx.db
        .query("rooms")
        .withIndex("by_host", (q) => q.eq("hostId", currentProfile._id))
        .filter((q) => q.eq(q.field("communityId"), undefined))
        .first());

    if (!fallbackRoom) return null;
    return await formatRoom(ctx, fallbackRoom);
  },
});

/** Get the current user's room in a community */
export const getMyCommunityRoom = query({
  args: { communityId: v.id("communities") },
  handler: async (ctx, args) => {
    const currentProfile = await getCurrentProfile(ctx);
    if (!currentProfile) return null;

    const room = await ctx.db
      .query("rooms")
      .withIndex("by_host_scope", (q) =>
        q.eq("hostId", currentProfile._id).eq("scopeKey", roomScopeKey(args.communityId))
      )
      .first();

    if (!room) return null;
    return await formatRoom(ctx, room);
  },
});

/** List active rooms with optional genre/search filter (paginated) */
export const listActivePaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    genre: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("rooms")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("desc")
      .paginate(args.paginationOpts);

    let filtered = result.page.filter((r) => !r.communityId);

    if (args.genre && args.genre.trim().length > 0) {
      const genre = args.genre.trim();
      filtered = filtered.filter((r) => r.genre === genre);
    }

    if (args.search && args.search.trim().length > 0) {
      const searchLower = args.search.trim().toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(searchLower) ||
          (r.description ?? "").toLowerCase().includes(searchLower) ||
          r.handle.toLowerCase().includes(searchLower)
      );
    }

    const page = await Promise.all(filtered.map((room) => formatRoom(ctx, room)));
    return { ...result, page };
  },
});

/** List active rooms scoped to a community */
export const listCommunityRoomsPaginated = query({
  args: {
    communityId: v.id("communities"),
    paginationOpts: paginationOptsValidator,
    genre: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("rooms")
      .withIndex("by_community_active", (q) =>
        q.eq("communityId", args.communityId).eq("isActive", true)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    let filtered = result.page;

    if (args.genre && args.genre.trim().length > 0) {
      const genre = args.genre.trim();
      filtered = filtered.filter((r) => r.genre === genre);
    }

    if (args.search && args.search.trim().length > 0) {
      const searchLower = args.search.trim().toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(searchLower) ||
          (r.description ?? "").toLowerCase().includes(searchLower) ||
          r.handle.toLowerCase().includes(searchLower)
      );
    }

    const page = await Promise.all(filtered.map((room) => formatRoom(ctx, room)));
    return { ...result, page };
  },
});

const MAX_PARTICIPANTS_RETURNED = 100;

/** Get participants of a room via presence (capped at 100) */
export const getParticipants = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || !room.isActive) return { participants: [], total_count: 0 };

    // Private room: only friends of host (or host) can see participants
    if (room.isPrivate) {
      const profile = await getCurrentProfile(ctx);
      if (!profile) return { participants: [], total_count: 0 };
      if (profile._id !== room.hostId) {
        const friends = await areFriends(ctx, profile._id, room.hostId);
        if (!friends) return { participants: [], total_count: 0 };
      }
    }

    const onlineUsers = await presence.listRoom(
      ctx,
      roomPresenceId(String(args.roomId)),
      true
    );

    const totalCount = onlineUsers.length;
    const capped = onlineUsers
      .filter((u) => u.userId)
      .slice(0, MAX_PARTICIPANTS_RETURNED);

    const participants = await Promise.all(
      capped.map(async (u) => {
        const isGuest = (u.userId as string).startsWith("guest:");
        if (isGuest) {
          return {
            profile_id: u.userId,
            profile: {
              id: u.userId,
              username: "Guest",
              display_name: "Guest",
              avatar_url: "",
            },
            role: "listener" as const,
            is_guest: true,
          };
        }
        const profile = await ctx.db.get(u.userId as Id<"profiles">);
        return {
          profile_id: u.userId,
          profile: profile ? formatPublicProfileIdentity(profile) : null,
          role: "listener" as const,
          is_guest: false,
        };
      })
    );

    return {
      participants: participants.filter((p) => p.profile !== null),
      total_count: totalCount,
    };
  },
});

/** Get friends who are currently in active rooms via presence */
export const getFriendsInRooms = query({
  args: {},
  handler: async (ctx) => {
    const currentProfile = await getCurrentProfile(ctx);
    if (!currentProfile) return [];

    const friendships = await ctx.db
      .query("friends")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", currentProfile._id).eq("status", "accepted")
      )
      .collect();

    if (friendships.length === 0) return [];

    const results: Array<{
      friend: ReturnType<typeof formatPublicProfileIdentity>;
      room_id: string;
      room_handle: string;
      room_name: string;
      role: string;
    }> = [];

    for (const friendship of friendships) {
      // Check all presence rooms this friend is in
      const userRooms = await presence.listUser(
        ctx,
        String(friendship.friendId),
        true
      );

      // Find a room: presence room starting with "room:"
      const roomPresence = userRooms.find(
        (r) => r.roomId.startsWith("room:") && r.online
      );
      if (!roomPresence) continue;

      // Extract the actual room ID from "room:{id}"
      const actualRoomId = roomPresence.roomId.replace("room:", "") as Id<"rooms">;
      const room = await ctx.db.get(actualRoomId);
      if (!room || !room.isActive) continue;
      if (room.communityId) continue;

      const friendProfile = await ctx.db.get(friendship.friendId);
      if (!friendProfile) continue;

      results.push({
        friend: formatPublicProfileIdentity(friendProfile),
        room_id: String(room._id),
        room_handle: room.handle,
        room_name: room.name,
        role: "listener",
      });
    }

    return results;
  },
});

// ============================================
// Mutations
// ============================================

/** Create a new room — one per user, unique handle */
export const create = mutation({
  args: {
    handle: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    genre: v.optional(v.string()),
    maxPerformers: v.optional(v.number()),
    isPrivate: v.optional(v.boolean()),
    communityId: v.optional(v.id("communities")),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    await checkRateLimit(ctx, "roomCreate", profile._id);

    if (args.communityId) {
      await requireCommunityMembership(ctx, args.communityId, profile._id);
      await selectCommunityJamServer(ctx, args.communityId);
    }
    const scopeKey = roomScopeKey(args.communityId);
    const existingRoom = await ctx.db
      .query("rooms")
      .withIndex("by_host_scope", (q) =>
        q.eq("hostId", profile._id).eq("scopeKey", scopeKey)
      )
      .first();
    if (existingRoom) {
      throw new Error(
        args.communityId
          ? "ROOM_LIMIT_REACHED: You can only host one room in this community"
          : "ROOM_LIMIT_REACHED: You can only host one global room"
      );
    }

    if (!args.communityId) {
      const legacyGlobalRoom = await ctx.db
        .query("rooms")
        .withIndex("by_host", (q) => q.eq("hostId", profile._id))
        .filter((q) => q.eq(q.field("communityId"), undefined))
        .first();
      if (legacyGlobalRoom) {
        throw new Error("ROOM_LIMIT_REACHED: You can only host one global room");
      }
    }

    const normalizedHandle = validateRoomHandle(args.handle);

    const name = sanitizeText(args.name) ?? "";
    if (name.length < MIN_LENGTHS.ROOM_NAME) {
      throw new Error(
        `ROOM_NAME_TOO_SHORT: Name must be at least ${MIN_LENGTHS.ROOM_NAME} characters`
      );
    }
    validateTextLength(name, MAX_LENGTHS.ROOM_NAME, "Room name");

    const description = sanitizeText(args.description);
    validateTextLength(description, MAX_LENGTHS.ROOM_DESCRIPTION, "Description");

    if (args.genre !== undefined) {
      if (!(ROOM_GENRES as readonly string[]).includes(args.genre)) {
        throw new Error("INVALID_GENRE: Invalid genre");
      }
    }

    const maxPerformers = args.maxPerformers ?? 5;
    if (maxPerformers < 2 || maxPerformers > 7) {
      throw new Error("INVALID_MAX_PERFORMERS: Max performers must be between 2 and 7");
    }

    const lockResult = await acquireUniqueLock(
      ctx,
      "room_handle",
      normalizedHandle,
      profile._id
    );
    if (!lockResult.acquired) {
      throw new Error("HANDLE_TAKEN: This handle is already in use");
    }

    const roomId = await ctx.db.insert("rooms", {
      hostId: profile._id,
      handle: normalizedHandle,
      name,
      description,
      genre: args.genre,
      maxPerformers,
      isPrivate: args.isPrivate ?? false,
      isActive: true,
      streamUrl: MOCK_STREAM_URL,
      status: "idle",
      communityId: args.communityId,
      scopeKey,
      lastActiveAt: Date.now(),
    });

    return roomId;
  },
});

/** Update room settings (host only). Handle is immutable. */
export const update = mutation({
  args: {
    roomId: v.id("rooms"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    genre: v.optional(v.string()),
    maxPerformers: v.optional(v.number()),
    isPrivate: v.optional(v.boolean()),
    communityId: v.optional(v.id("communities")),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    await checkRateLimit(ctx, "roomUpdate", profile._id);

    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    if (room.hostId !== profile._id) {
      throw new Error("UNAUTHORIZED: Only the host can edit this room");
    }

    const patch: Partial<Doc<"rooms">> = {};

    if (args.name !== undefined) {
      const name = sanitizeText(args.name) ?? "";
      if (name.length < MIN_LENGTHS.ROOM_NAME) {
        throw new Error(
          `ROOM_NAME_TOO_SHORT: Name must be at least ${MIN_LENGTHS.ROOM_NAME} characters`
        );
      }
      validateTextLength(name, MAX_LENGTHS.ROOM_NAME, "Room name");
      patch.name = name;
    }

    if (args.description !== undefined) {
      const description = sanitizeText(args.description);
      validateTextLength(description, MAX_LENGTHS.ROOM_DESCRIPTION, "Description");
      patch.description = description;
    }

    if (args.genre !== undefined) {
      if (!(ROOM_GENRES as readonly string[]).includes(args.genre)) {
        throw new Error("INVALID_GENRE: Invalid genre");
      }
      patch.genre = args.genre;
    }

    if (args.maxPerformers !== undefined) {
      if (args.maxPerformers < 2 || args.maxPerformers > 7) {
        throw new Error(
          "INVALID_MAX_PERFORMERS: Max performers must be between 2 and 7"
        );
      }
      patch.maxPerformers = args.maxPerformers;
    }

    if (args.isPrivate !== undefined) patch.isPrivate = args.isPrivate;
    if (args.communityId !== undefined) patch.communityId = args.communityId;

    await ctx.db.patch(args.roomId, patch);

    const updated = await ctx.db.get(args.roomId);
    if (!updated) throw new Error("Room not found after update");
    return await formatRoom(ctx, updated);
  },
});

/** Activate a room (host only) */
export const activate = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    await checkRateLimit(ctx, "roomToggle", profile._id);

    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    if (room.hostId !== profile._id) {
      throw new Error("UNAUTHORIZED: Only the host can activate this room");
    }

    await ctx.db.patch(args.roomId, { isActive: true, lastActiveAt: Date.now() });
    return { success: true };
  },
});

/** Deactivate a room (host only). Presence expires naturally. */
export const deactivate = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    await checkRateLimit(ctx, "roomToggle", profile._id);

    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    if (room.hostId !== profile._id) {
      throw new Error("UNAUTHORIZED: Only the host can deactivate this room");
    }

    await ctx.db.patch(args.roomId, { isActive: false });
    return { success: true };
  },
});

/** Delete a room entirely (host only) */
export const deleteRoom = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    await checkRateLimit(ctx, "roomDelete", profile._id);

    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    if (room.hostId !== profile._id) {
      throw new Error("UNAUTHORIZED: Only the host can delete this room");
    }

    // Delete room messages (capped per mutation to avoid timeout)
    const messages = await ctx.db
      .query("room_messages")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(500);
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    await releaseUniqueLock(ctx, "room_handle", room.handle);
    await ctx.db.delete(args.roomId);
    return { success: true };
  },
});

/** Mint a short-lived performer token and assign/reuse the room's active jam server session. */
export const createPerformerJoinToken = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    await requirePerformerRoomAccess(ctx, profile, room);

    const now = Date.now();
    let session = await getActiveJamSession(ctx, args.roomId);

    if (session && session.expiresAt <= now) {
      await ctx.db.patch(session._id, { status: "expired" });
      session = null;
    }

    let server: Doc<"jam_servers"> | null = null;
    if (session) {
      server = await ctx.db.get(session.jamServerId);
      if (!server || server.status !== "enabled") {
        await ctx.db.patch(session._id, { status: "expired" });
        session = null;
        server = null;
      }
    }

    if (!server) {
      server = room.communityId
        ? await selectCommunityJamServer(ctx, room.communityId)
        : await selectOfficialJamServer(ctx);
    } else if (!server.joinSecret.trim()) {
      throw new Error("JAM_SERVER_SECRET_MISSING");
    }

    const sessionExpiresAt = now + JAM_SESSION_TTL_MS;
    const lastRefreshAt = session?.lastRefreshAt ?? now;
    let sessionId: Id<"jam_sessions">;

    if (session) {
      sessionId = session._id;
      await ctx.db.patch(session._id, {
        lastJoinAt: now,
        expiresAt: sessionExpiresAt,
      });
    } else {
      sessionId = await ctx.db.insert("jam_sessions", {
        roomId: args.roomId,
        jamServerId: server._id,
        serverId: server.serverId,
        status: "active",
        startedAt: now,
        lastJoinAt: now,
        lastRefreshAt,
        expiresAt: sessionExpiresAt,
      });
    }

    await ctx.db.patch(args.roomId, { status: "live", lastActiveAt: now });

    const tokenExpiresAt = now + JOIN_TOKEN_TTL_MS;
    const role = "performer";
    const nonce = randomNonce();
    const payload = [
      "v1",
      tokenExpiresAt,
      server.serverId,
      String(room._id),
      String(profile._id),
      role,
      nonce,
    ].join("|");
    const signature = await hmacSha256Hex(server.joinSecret, payload);
    const joinToken = [
      "v1",
      tokenExpiresAt,
      server.serverId,
      String(room._id),
      String(profile._id),
      role,
      nonce,
      signature,
    ].join(".");

    return {
      serverHost: server.host,
      serverPort: server.port,
      serverId: server.serverId,
      roomId: String(room._id),
      roomHandle: room.handle,
      profileId: String(profile._id),
      displayName: profile.displayName || profile.username,
      joinToken,
      codec: "opus" as const,
      frames: 120,
      sessionId,
      expiresAtMs: tokenExpiresAt,
    };
  },
});

/** Keep the temporary jam session alive while the local native process is still running. */
export const refreshJamSession = mutation({
  args: { sessionId: v.id("jam_sessions") },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.status !== "active") return { refreshed: false };

    const room = await ctx.db.get(session.roomId);
    if (!room) {
      await ctx.db.patch(args.sessionId, { status: "expired" });
      return { refreshed: false };
    }
    await requirePerformerRoomAccess(ctx, profile, room);

    const now = Date.now();
    if (session.expiresAt <= now) {
      await ctx.db.patch(args.sessionId, { status: "expired" });
      return { refreshed: false };
    }

    await ctx.db.patch(args.sessionId, {
      lastRefreshAt: now,
      expiresAt: now + JAM_SESSION_TTL_MS,
    });
    await ctx.db.patch(session.roomId, { status: "live", lastActiveAt: now });
    return { refreshed: true };
  },
});

/** Manual cleanup bridge until SFU-authoritative session presence exists. */
export const expireStaleJamSessions = mutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const staleSessions = await ctx.db
      .query("jam_sessions")
      .withIndex("by_expires_at", (q) => q.lte("expiresAt", now))
      .filter((q) => q.eq(q.field("status"), "active"))
      .take(Math.min(args.limit ?? 50, 100));

    let expired = 0;
    for (const session of staleSessions) {
      await ctx.db.patch(session._id, { status: "expired" });
      expired += 1;

      const newerActive = await getActiveJamSession(ctx, session.roomId);
      if (!newerActive || newerActive.expiresAt <= now) {
        await ctx.db.patch(session.roomId, {
          status: "idle",
          lastActiveAt: now,
        });
      }
    }
    return { expired };
  },
});

// ============================================
// Server-facing mutations (for jam server)
// ============================================

/** Set room stream URL (host only) */
export const setStreamUrl = mutation({
  args: { roomId: v.id("rooms"), streamUrl: v.string() },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    await checkRateLimit(ctx, "roomServerUpdate", profile._id);
    validateUrl(args.streamUrl);
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    if (room.hostId !== profile._id) throw new Error("NOT_HOST");
    await ctx.db.patch(args.roomId, { streamUrl: args.streamUrl });
    return { success: true };
  },
});

/** Update room status (host only) — "idle" or "live" */
export const updateRoomStatus = mutation({
  args: { roomId: v.id("rooms"), status: v.string() },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    await checkRateLimit(ctx, "roomServerUpdate", profile._id);
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    if (room.hostId !== profile._id) throw new Error("NOT_HOST");
    if (args.status !== "idle" && args.status !== "live") {
      throw new Error("INVALID_STATUS: Must be 'idle' or 'live'");
    }
    await ctx.db.patch(args.roomId, {
      status: args.status as "idle" | "live",
    });
    return { success: true };
  },
});
