import { internalMutation, query, mutation } from "./_generated/server";
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

declare const process: {
  env: Record<string, string | undefined>;
};

const presence = new Presence(components.presence);

// ============================================
// Room Constants
// ============================================

const JOIN_TOKEN_TTL_MS = 2 * 60 * 1000;
const JAM_SESSION_TTL_MS = 5 * 60 * 1000;
const LISTENER_SESSION_TTL_MS = 5 * 60 * 1000;
const LISTENER_IPC_PORT = 39000;
const LISTENER_HLS_BASE_URL = envOrDefault(
  "LISTENER_PUBLIC_HLS_BASE_URL",
  "http://127.0.0.1:8080/hls"
);
const LISTENER_SRT_BASE_URL = envOrDefault(
  "LISTENER_SRT_BASE_URL",
  "srt://127.0.0.1:8890"
);
const LISTENER_SRT_PASSPHRASE = envOrDefault(
  "LISTENER_SRT_PASSPHRASE",
  "jam-v3-publish-passphrase"
);

import { ROOM_GENRES } from "./shared";
export { ROOM_GENRES, type RoomGenre } from "./shared";

const roomVisibilityValidator = v.union(
  v.literal("public"),
  v.literal("unlisted"),
  v.literal("private")
);
const roomListenAccessValidator = v.union(
  v.literal("anyone"),
  v.literal("friends"),
  v.literal("approved")
);
const roomJamAccessValidator = v.union(
  v.literal("anyone"),
  v.literal("friends"),
  v.literal("approved"),
  v.literal("host")
);
const roomAccessRequestTypeValidator = v.union(
  v.literal("listen"),
  v.literal("jam")
);
const roomAccessDecisionValidator = v.union(
  v.literal("approved"),
  v.literal("rejected")
);
type RoomAccessType = "listen" | "jam";

/** Presence room ID for a jam room */
function roomPresenceId(roomId: string) {
  return `room:${roomId}`;
}

function roomScopeKey(communityId?: Id<"communities">) {
  return communityId ? `community:${communityId}` : "global";
}

function envOrDefault(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value ? value.replace(/\/+$/, "") : fallback;
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

async function sha256Hex(payload: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload)
  );
  return toHex(digest);
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function localListenerHlsUrl(room: Doc<"rooms">): string {
  return `${LISTENER_HLS_BASE_URL}/${room.handle}/stream.m3u8`;
}

function localListenerSrtUrl(room: Doc<"rooms">, publishUser: string, publishKey: string): string {
  return `${LISTENER_SRT_BASE_URL}?streamid=publish:${room.handle}:${publishUser}:${publishKey}&passphrase=${LISTENER_SRT_PASSPHRASE}&pkt_size=1316`;
}

function requireRoomHost(profile: Doc<"profiles">, room: Doc<"rooms">) {
  if (room.hostId !== profile._id) throw new Error("NOT_HOST");
}

function roomVisibility(room: Doc<"rooms">) {
  return room.visibility ?? (room.isPrivate ? "private" : "public");
}

function roomListenAccess(room: Doc<"rooms">) {
  return room.listenAccess ?? (room.isPrivate ? "friends" : "anyone");
}

function roomJamAccess(room: Doc<"rooms">) {
  return room.jamAccess ?? (room.isPrivate ? "friends" : "anyone");
}

async function hasRoomGrant(
  ctx: QueryCtx | MutationCtx,
  roomId: Id<"rooms">,
  profileId: Id<"profiles">,
  type: RoomAccessType
) {
  const directGrant = await ctx.db
    .query("room_access_grants")
    .withIndex("by_room_profile_type", (q) =>
      q.eq("roomId", roomId).eq("profileId", profileId).eq("type", type)
    )
    .first();
  if (directGrant) return true;
  if (type === "listen") return false;
  return Boolean(
    await ctx.db
      .query("room_access_grants")
      .withIndex("by_room_profile_type", (q) =>
        q.eq("roomId", roomId).eq("profileId", profileId).eq("type", "listen")
      )
      .first()
  );
}

async function canListenToRoom(
  ctx: QueryCtx | MutationCtx,
  profile: Doc<"profiles"> | null,
  room: Doc<"rooms">
) {
  if (room.hostId === profile?._id) return true;
  const listenAccess = roomListenAccess(room);
  if (listenAccess === "anyone") return true;
  if (!profile) return false;
  if (listenAccess === "friends") {
    return await areFriends(ctx, profile._id, room.hostId);
  }
  return await hasRoomGrant(ctx, room._id, profile._id, "listen");
}

async function canJamInRoom(
  ctx: QueryCtx | MutationCtx,
  profile: Doc<"profiles">,
  room: Doc<"rooms">
) {
  if (room.hostId === profile._id) return true;
  const jamAccess = roomJamAccess(room);
  if (jamAccess === "host") return false;
  if (jamAccess === "anyone") return true;
  if (jamAccess === "friends") {
    return await areFriends(ctx, profile._id, room.hostId);
  }
  return await hasRoomGrant(ctx, room._id, profile._id, "jam");
}

async function getRequestStatus(
  ctx: QueryCtx | MutationCtx,
  roomId: Id<"rooms">,
  profileId: Id<"profiles"> | undefined,
  type: RoomAccessType
) {
  if (!profileId) return null;
  const request = await ctx.db
    .query("room_access_requests")
    .withIndex("by_room_requester_type", (q) =>
      q.eq("roomId", roomId).eq("requesterId", profileId).eq("type", type)
    )
    .first();
  return request?.status ?? null;
}

async function requireRoomAccess(
  ctx: QueryCtx | MutationCtx,
  profile: Doc<"profiles">,
  room: Doc<"rooms">
) {
  if (!room.isActive) throw new Error("ROOM_INACTIVE");
  if (!(await canListenToRoom(ctx, profile, room))) {
    throw new Error("ROOM_ACCESS_REQUIRED");
  }
}

async function canViewRoom(
  ctx: QueryCtx | MutationCtx,
  room: Doc<"rooms">
) {
  if (roomVisibility(room) !== "private") return true;
  const profile = await getCurrentProfile(ctx);
  if (!profile) return false;
  if (room.hostId === profile._id) return true;
  return await canListenToRoom(ctx, profile, room);
}

async function filterVisibleRooms(
  ctx: QueryCtx | MutationCtx,
  rooms: Doc<"rooms">[]
) {
  const visibleRooms: Doc<"rooms">[] = [];
  for (const room of rooms) {
    if (await canViewRoom(ctx, room)) visibleRooms.push(room);
  }
  return visibleRooms;
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
  if (!(await canJamInRoom(ctx, profile, room))) {
    throw new Error("JAM_ACCESS_REQUIRED");
  }
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
  const currentProfile = await getCurrentProfile(ctx);
  const canListen = await canListenToRoom(ctx, currentProfile, room);
  const canJam = currentProfile
    ? await canJamInRoom(ctx, currentProfile, room)
    : roomJamAccess(room) === "anyone";

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
    visibility: roomVisibility(room),
    listen_access: roomListenAccess(room),
    jam_access: roomJamAccess(room),
    viewer_access: {
      can_listen: canListen,
      can_jam: canJam,
      listen_request_status: await getRequestStatus(
        ctx,
        room._id,
        currentProfile?._id,
        "listen"
      ),
      jam_request_status: await getRequestStatus(
        ctx,
        room._id,
        currentProfile?._id,
        "jam"
      ),
    },
    is_active: room.isActive,
    stream_url: room.streamUrl ?? null,
    status: room.status,
    listener: {
      status: room.listenerStatus ?? "off",
      hls_url: room.streamUrl ?? null,
      session_id: room.listenerSessionId ?? null,
      started_at: room.listenerStartedAt
        ? new Date(room.listenerStartedAt).toISOString()
        : null,
      updated_at: room.listenerUpdatedAt
        ? new Date(room.listenerUpdatedAt).toISOString()
        : null,
      expires_at: room.listenerExpiresAt
        ? new Date(room.listenerExpiresAt).toISOString()
        : null,
      error: room.listenerError ?? null,
    },
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
    if (!(await canViewRoom(ctx, room))) return null;
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

    let filtered = await filterVisibleRooms(
      ctx,
      result.page.filter((r) => !r.communityId && roomVisibility(r) === "public")
    );

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

/** List active rooms scoped to communities with optional genre/search filter (paginated) */
export const listActiveCommunityPaginated = query({
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

    let filtered = await filterVisibleRooms(
      ctx,
      result.page.filter((r) => r.communityId && roomVisibility(r) === "public")
    );

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

    let filtered = await filterVisibleRooms(
      ctx,
      result.page.filter((r) => roomVisibility(r) === "public")
    );

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

    const profile = await getCurrentProfile(ctx);
    if (!(await canListenToRoom(ctx, profile, room))) {
      return { participants: [], total_count: 0 };
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

export const getModeration = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    if (!profile) return { pending: [], approved: [] };
    const room = await ctx.db.get(args.roomId);
    if (!room || room.hostId !== profile._id) {
      return { pending: [], approved: [] };
    }

    const requests = await ctx.db
      .query("room_access_requests")
      .withIndex("by_room_status", (q) =>
        q.eq("roomId", args.roomId).eq("status", "pending")
      )
      .collect();
    const grants = await ctx.db
      .query("room_access_grants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const pending = await Promise.all(
      requests.map(async (request) => {
        const requester = await ctx.db.get(request.requesterId);
        return {
          id: request._id,
          type: request.type,
          status: request.status,
          requester: requester ? formatPublicProfileIdentity(requester) : null,
          requested_at: new Date(request._creationTime).toISOString(),
        };
      })
    );

    const approved = await Promise.all(
      grants.map(async (grant) => {
        const grantedProfile = await ctx.db.get(grant.profileId);
        return {
          id: grant._id,
          type: grant.type,
          profile: grantedProfile
            ? formatPublicProfileIdentity(grantedProfile)
            : null,
          granted_at: new Date(grant.grantedAt).toISOString(),
        };
      })
    );

    return {
      pending: pending.filter((item) => item.requester !== null),
      approved: approved.filter((item) => item.profile !== null),
    };
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
    visibility: v.optional(roomVisibilityValidator),
    listenAccess: v.optional(roomListenAccessValidator),
    jamAccess: v.optional(roomJamAccessValidator),
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

    const visibility =
      args.visibility ?? (args.isPrivate ? "private" : "public");
    const listenAccess =
      args.listenAccess ?? (args.isPrivate ? "friends" : "anyone");
    const jamAccess =
      args.jamAccess ?? (args.isPrivate ? "friends" : "anyone");

    const roomId = await ctx.db.insert("rooms", {
      hostId: profile._id,
      handle: normalizedHandle,
      name,
      description,
      genre: args.genre,
      maxPerformers,
      isPrivate: visibility === "private",
      visibility,
      listenAccess,
      jamAccess,
      isActive: true,
      status: "idle",
      listenerStatus: "off",
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
    visibility: v.optional(roomVisibilityValidator),
    listenAccess: v.optional(roomListenAccessValidator),
    jamAccess: v.optional(roomJamAccessValidator),
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

    if (args.visibility !== undefined) {
      patch.visibility = args.visibility;
      patch.isPrivate = args.visibility === "private";
    } else if (args.isPrivate !== undefined) {
      patch.isPrivate = args.isPrivate;
      patch.visibility = args.isPrivate ? "private" : "public";
      if (args.listenAccess === undefined) patch.listenAccess = args.isPrivate ? "friends" : "anyone";
      if (args.jamAccess === undefined) patch.jamAccess = args.isPrivate ? "friends" : "anyone";
    }
    if (args.listenAccess !== undefined) patch.listenAccess = args.listenAccess;
    if (args.jamAccess !== undefined) patch.jamAccess = args.jamAccess;
    if (args.communityId !== undefined) patch.communityId = args.communityId;

    await ctx.db.patch(args.roomId, patch);

    const updated = await ctx.db.get(args.roomId);
    if (!updated) throw new Error("Room not found after update");
    return await formatRoom(ctx, updated);
  },
});

export const requestAccess = mutation({
  args: {
    roomId: v.id("rooms"),
    type: roomAccessRequestTypeValidator,
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    await checkRateLimit(ctx, "roomUpdate", profile._id);
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.hostId === profile._id) throw new Error("HOST_ALREADY_ALLOWED");

    const alreadyAllowed =
      args.type === "listen"
        ? await canListenToRoom(ctx, profile, room)
        : await canJamInRoom(ctx, profile, room);
    if (alreadyAllowed) return { status: "approved" as const };

    const existing = await ctx.db
      .query("room_access_requests")
      .withIndex("by_room_requester_type", (q) =>
        q.eq("roomId", args.roomId).eq("requesterId", profile._id).eq("type", args.type)
      )
      .first();
    const now = Date.now();
    if (existing) {
      if (existing.status !== "pending") {
        await ctx.db.patch(existing._id, {
          status: "pending",
          updatedAt: now,
        });
      }
      return { status: "pending" as const };
    }

    await ctx.db.insert("room_access_requests", {
      roomId: args.roomId,
      requesterId: profile._id,
      type: args.type,
      status: "pending",
      updatedAt: now,
    });
    return { status: "pending" as const };
  },
});

export const decideAccessRequest = mutation({
  args: {
    requestId: v.id("room_access_requests"),
    decision: roomAccessDecisionValidator,
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    await checkRateLimit(ctx, "roomUpdate", profile._id);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("REQUEST_NOT_FOUND");
    const room = await ctx.db.get(request.roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    requireRoomHost(profile, room);

    const now = Date.now();
    await ctx.db.patch(request._id, {
      status: args.decision,
      decidedBy: profile._id,
      decidedAt: now,
      updatedAt: now,
    });

    if (args.decision === "approved") {
      const existingGrant = await ctx.db
        .query("room_access_grants")
        .withIndex("by_room_profile_type", (q) =>
          q
            .eq("roomId", request.roomId)
            .eq("profileId", request.requesterId)
            .eq("type", request.type)
        )
        .first();
      if (!existingGrant) {
        await ctx.db.insert("room_access_grants", {
          roomId: request.roomId,
          profileId: request.requesterId,
          type: request.type,
          grantedBy: profile._id,
          grantedAt: now,
        });
      }
    }

    return { success: true };
  },
});

export const revokeAccessGrant = mutation({
  args: { grantId: v.id("room_access_grants") },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    await checkRateLimit(ctx, "roomUpdate", profile._id);
    const grant = await ctx.db.get(args.grantId);
    if (!grant) return { success: true };
    const room = await ctx.db.get(grant.roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    requireRoomHost(profile, room);
    await ctx.db.delete(grant._id);
    return { success: true };
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

export const startListenerMode = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    await checkRateLimit(ctx, "roomServerUpdate", profile._id);

    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    requireRoomHost(profile, room);
    if (!room.isActive) throw new Error("ROOM_INACTIVE");

    const now = Date.now();
    const activeSessions = await ctx.db
      .query("listener_publish_sessions")
      .withIndex("by_room_status", (q) =>
        q.eq("roomId", args.roomId).eq("status", "active")
      )
      .take(20);

    for (const session of activeSessions) {
      await ctx.db.patch(session._id, {
        status: session.expiresAt <= now ? "expired" : "revoked",
        revokedAt: session.expiresAt <= now ? undefined : now,
      });
    }

    const hlsUrl = localListenerHlsUrl(room);
    validateUrl(hlsUrl);
    const publishKey = randomNonce() + randomNonce();
    const publishUser = randomNonce();
    const expiresAt = now + LISTENER_SESSION_TTL_MS;
    const publishSessionId = await ctx.db.insert("listener_publish_sessions", {
      roomId: args.roomId,
      ownerProfileId: profile._id,
      status: "active",
      path: room.handle,
      publicHlsUrl: hlsUrl,
      publishUser,
      publishKeyHash: await sha256Hex(publishKey),
      createdAt: now,
      lastRefreshAt: now,
      expiresAt,
    });

    await ctx.db.patch(args.roomId, {
      streamUrl: hlsUrl,
      status: "live",
      listenerStatus: "starting",
      listenerSessionId: publishSessionId,
      listenerStartedAt: now,
      listenerUpdatedAt: now,
      listenerExpiresAt: expiresAt,
      listenerError: undefined,
      lastActiveAt: now,
    });

    return {
      ipcPort: LISTENER_IPC_PORT,
      srtUrl: localListenerSrtUrl(room, publishUser, publishKey),
      hlsUrl,
      roomPath: room.handle,
      publishSessionId,
      publishUser,
      publishKey,
      expiresAtMs: expiresAt,
    };
  },
});

export const refreshListenerMode = mutation({
  args: { publishSessionId: v.id("listener_publish_sessions") },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    const session = await ctx.db.get(args.publishSessionId);
    if (!session || session.status !== "active") return { refreshed: false };

    const room = await ctx.db.get(session.roomId);
    if (!room) {
      await ctx.db.patch(args.publishSessionId, { status: "expired" });
      return { refreshed: false };
    }
    requireRoomHost(profile, room);

    const now = Date.now();
    if (session.expiresAt <= now) {
      await ctx.db.patch(args.publishSessionId, { status: "expired" });
      await ctx.db.patch(session.roomId, {
        listenerStatus: "off",
        listenerSessionId: undefined,
        listenerUpdatedAt: now,
        listenerExpiresAt: undefined,
        streamUrl: undefined,
      });
      return { refreshed: false };
    }

    const expiresAt = now + LISTENER_SESSION_TTL_MS;
    await ctx.db.patch(args.publishSessionId, {
      lastRefreshAt: now,
      expiresAt,
    });
    await ctx.db.patch(session.roomId, {
      listenerStatus: "live",
      listenerUpdatedAt: now,
      listenerExpiresAt: expiresAt,
      lastActiveAt: now,
    });
    return { refreshed: true, expiresAtMs: expiresAt };
  },
});

export const stopListenerMode = mutation({
  args: {
    roomId: v.id("rooms"),
    publishSessionId: v.optional(v.id("listener_publish_sessions")),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    await checkRateLimit(ctx, "roomServerUpdate", profile._id);

    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    requireRoomHost(profile, room);

    const now = Date.now();
    if (args.publishSessionId) {
      const session = await ctx.db.get(args.publishSessionId);
      if (session?.roomId === args.roomId && session.status === "active") {
        await ctx.db.patch(args.publishSessionId, {
          status: "revoked",
          revokedAt: now,
        });
      }
    }

    const activeSessions = await ctx.db
      .query("listener_publish_sessions")
      .withIndex("by_room_status", (q) =>
        q.eq("roomId", args.roomId).eq("status", "active")
      )
      .take(20);

    for (const session of activeSessions) {
      await ctx.db.patch(session._id, {
        status: "revoked",
        revokedAt: now,
      });
    }

    const activeJamSession = await getActiveJamSession(ctx, args.roomId);
    await ctx.db.patch(args.roomId, {
      streamUrl: undefined,
      status: activeJamSession && activeJamSession.expiresAt > now ? "live" : "idle",
      listenerStatus: "off",
      listenerSessionId: undefined,
      listenerUpdatedAt: now,
      listenerExpiresAt: undefined,
      listenerError: undefined,
      lastActiveAt: now,
    });

    return { success: true };
  },
});

export const expireStaleListenerSessions = internalMutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const staleSessions = await ctx.db
      .query("listener_publish_sessions")
      .withIndex("by_expires_at", (q) => q.lte("expiresAt", now))
      .filter((q) => q.eq(q.field("status"), "active"))
      .take(Math.min(args.limit ?? 50, 100));

    let expired = 0;
    for (const session of staleSessions) {
      await ctx.db.patch(session._id, { status: "expired" });
      expired += 1;

      const room = await ctx.db.get(session.roomId);
      if (room?.listenerSessionId === session._id) {
        await ctx.db.patch(session.roomId, {
          streamUrl: undefined,
          listenerStatus: "off",
          listenerSessionId: undefined,
          listenerUpdatedAt: now,
          listenerExpiresAt: undefined,
        });
      }
    }
    return { expired };
  },
});

export const validateListenerPublish = internalMutation({
  args: {
    action: v.string(),
    protocol: v.string(),
    path: v.string(),
    user: v.optional(v.string()),
    password: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.action === "read" || args.action === "playback") {
      return { authorized: true };
    }
    if (args.action !== "publish" || args.protocol !== "srt") {
      return { authorized: false };
    }
    if (!args.user) return { authorized: false };

    const secret = args.password || args.token;
    if (!secret) return { authorized: false };

    const session = await ctx.db
      .query("listener_publish_sessions")
      .withIndex("by_publish_user", (q) => q.eq("publishUser", args.user!))
      .first();
    if (!session || session.status !== "active") return { authorized: false };
    if (session.path !== args.path) return { authorized: false };

    const now = Date.now();
    if (session.expiresAt <= now) {
      await ctx.db.patch(session._id, { status: "expired" });
      return { authorized: false };
    }

    const keyHash = await sha256Hex(secret);
    if (keyHash !== session.publishKeyHash) return { authorized: false };

    await ctx.db.patch(session._id, { lastRefreshAt: now });
    return { authorized: true };
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
