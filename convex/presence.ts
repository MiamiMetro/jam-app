import { Presence } from "@convex-dev/presence";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { requireAuth, areFriends } from "./helpers";
import { checkRateLimit } from "./rateLimiter";

export const GLOBAL_PRESENCE_ROOM_ID = "global:online";
export const DEFAULT_PRESENCE_HEARTBEAT_INTERVAL_MS = 20_000;

export const presenceStatusValidator = v.union(
  v.literal("online"),
  v.literal("away"),
  v.literal("busy")
);
const roomPresenceRoleValidator = v.union(
  v.literal("listener"),
  v.literal("performer")
);

const MIN_HEARTBEAT_INTERVAL_MS = 5_000;
const MAX_HEARTBEAT_INTERVAL_MS = 120_000;

const presence = new Presence(components.presence);

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
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  profileId: Id<"profiles">,
  type: "listen" | "jam"
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

async function requireRoomListenAccess(
  ctx: MutationCtx,
  room: Doc<"rooms">,
  profile: Doc<"profiles">
) {
  if (room.hostId === profile._id) return;

  const listenAccess = roomListenAccess(room);
  if (listenAccess === "friends") {
    const friends = await areFriends(ctx, profile._id, room.hostId);
    if (!friends) throw new Error("ROOM_ACCESS_REQUIRED: Friends only");
  } else if (listenAccess === "approved") {
    const granted = await hasRoomGrant(ctx, room._id, profile._id, "listen");
    if (!granted) throw new Error("ROOM_ACCESS_REQUIRED: Approval required");
  }
}

async function requireRoomJamAccess(
  ctx: MutationCtx,
  room: Doc<"rooms">,
  profile: Doc<"profiles">
) {
  if (room.hostId !== profile._id) {
    const jamAccess = roomJamAccess(room);
    if (jamAccess === "host") {
      throw new Error("JAM_ACCESS_REQUIRED");
    }
    if (jamAccess === "friends") {
      const friends = await areFriends(ctx, profile._id, room.hostId);
      if (!friends) throw new Error("JAM_ACCESS_REQUIRED: Friends only");
    } else if (jamAccess === "approved") {
      const granted = await hasRoomGrant(ctx, room._id, profile._id, "jam");
      if (!granted) throw new Error("JAM_ACCESS_REQUIRED: Approval required");
    }
  }

  if (room.communityId) {
    const communityId = room.communityId;
    const membership = await ctx.db
      .query("community_members")
      .withIndex("by_community_and_profile", (q) =>
        q.eq("communityId", communityId).eq("profileId", profile._id)
      )
      .first();
    if (!membership) throw new Error("COMMUNITY_MEMBERSHIP_REQUIRED");
  }
}

async function updateRoomParticipantRole(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  profileId: Id<"profiles">,
  role: "listener" | "performer"
) {
  const now = Date.now();
  const existing = await ctx.db
    .query("room_participant_roles")
    .withIndex("by_room_profile", (q) =>
      q.eq("roomId", roomId).eq("profileId", profileId)
    )
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, { role, updatedAt: now });
  } else {
    await ctx.db.insert("room_participant_roles", {
      roomId,
      profileId,
      role,
      updatedAt: now,
    });
  }
}

async function getRoomPresenceLeave(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  profileId: Id<"profiles">
) {
  return await ctx.db
    .query("room_presence_leaves")
    .withIndex("by_room_profile", (q) =>
      q.eq("roomId", roomId).eq("profileId", profileId)
    )
    .first();
}

function clampHeartbeatInterval(interval: number | undefined) {
  if (interval === undefined) {
    return DEFAULT_PRESENCE_HEARTBEAT_INTERVAL_MS;
  }
  return Math.max(
    MIN_HEARTBEAT_INTERVAL_MS,
    Math.min(MAX_HEARTBEAT_INTERVAL_MS, Math.floor(interval))
  );
}

export const heartbeat = mutation({
  args: {
    sessionId: v.string(),
    interval: v.optional(v.number()),
    status: v.optional(presenceStatusValidator),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    const interval = clampHeartbeatInterval(args.interval);
    const result = await presence.heartbeat(
      ctx,
      GLOBAL_PRESENCE_ROOM_ID,
      String(profile._id),
      args.sessionId,
      interval
    );
    await presence.updateRoomUser(
      ctx,
      GLOBAL_PRESENCE_ROOM_ID,
      String(profile._id),
      {
        status: args.status ?? "online",
      }
    );
    return result;
  },
});

export const disconnect = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    return await presence.disconnect(ctx, args.sessionToken);
  },
});

/**
 * Heartbeat into a jam room presence room.
 * Validates room access (active, private/friends-only).
 */
export const roomHeartbeat = mutation({
  args: {
    roomId: v.id("rooms"),
    sessionId: v.string(),
    interval: v.optional(v.number()),
    role: v.optional(roomPresenceRoleValidator),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    const interval = clampHeartbeatInterval(args.interval);
    const role = args.role ?? "listener";

    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (!room.isActive) throw new Error("ROOM_INACTIVE");

    await requireRoomListenAccess(ctx, room, profile);
    if (role === "performer") {
      await requireRoomJamAccess(ctx, room, profile);
    }

    const leave = await getRoomPresenceLeave(ctx, args.roomId, profile._id);
    if (leave?.sessionId === args.sessionId) {
      throw new Error("ROOM_LEFT");
    }
    if (leave) {
      await ctx.db.delete(leave._id);
    }

    const roomPresenceId = `room:${args.roomId}`;
    const result = await presence.heartbeat(
      ctx,
      roomPresenceId,
      String(profile._id),
      args.sessionId,
      interval
    );
    await updateRoomParticipantRole(ctx, args.roomId, profile._id, role);
    await presence.updateRoomUser(ctx, roomPresenceId, String(profile._id), {
      role,
    });
    return result;
  },
});

export const leaveRoomPresence = mutation({
  args: {
    roomId: v.id("rooms"),
    sessionId: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    const now = Date.now();
    const existing = await getRoomPresenceLeave(ctx, args.roomId, profile._id);
    if (existing) {
      await ctx.db.patch(existing._id, {
        sessionId: args.sessionId,
        leftAt: now,
      });
    } else {
      await ctx.db.insert("room_presence_leaves", {
        roomId: args.roomId,
        profileId: profile._id,
        sessionId: args.sessionId,
        leftAt: now,
      });
    }

    if (args.sessionToken) {
      await presence.disconnect(ctx, args.sessionToken);
    }

    return { left: true };
  },
});

/**
 * Guest heartbeat for jam rooms — no auth required, public rooms only.
 * Uses "guest:{sessionId}" as the user identifier.
 */
const MAX_SESSION_ID_LENGTH = 100;

export const guestRoomHeartbeat = mutation({
  args: {
    roomId: v.id("rooms"),
    sessionId: v.string(),
    interval: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.sessionId.length > MAX_SESSION_ID_LENGTH) {
      throw new Error("INVALID_SESSION_ID: Session ID too long");
    }
    await checkRateLimit(ctx, "guestRoomHeartbeat", args.sessionId);
    const interval = clampHeartbeatInterval(args.interval);

    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (!room.isActive) throw new Error("ROOM_INACTIVE");
    if (roomVisibility(room) === "private" || roomListenAccess(room) !== "anyone") {
      throw new Error("ROOM_ACCESS_REQUIRED: Sign in to join");
    }

    const guestUserId = `guest:${args.sessionId}`;
    const roomPresenceId = `room:${args.roomId}`;
    return await presence.heartbeat(
      ctx,
      roomPresenceId,
      guestUserId,
      args.sessionId,
      interval
    );
  },
});

export const setMyStatus = mutation({
  args: {
    status: presenceStatusValidator,
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    await checkRateLimit(ctx, "presenceStatus", String(profile._id));
    await presence.updateRoomUser(
      ctx,
      GLOBAL_PRESENCE_ROOM_ID,
      String(profile._id),
      {
        status: args.status,
      }
    );
    return { status: args.status };
  },
});
