import { mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { requireAuth, sanitizeText, validateTextLength } from "./helpers";
import { checkRateLimit } from "./rateLimiter";

const reportReasonValidator = v.union(
  v.literal("harassment"),
  v.literal("hate"),
  v.literal("sexual_content"),
  v.literal("violence"),
  v.literal("spam"),
  v.literal("impersonation"),
  v.literal("illegal"),
  v.literal("other")
);

const targetTypeValidator = v.union(
  v.literal("profile"),
  v.literal("post"),
  v.literal("comment"),
  v.literal("message"),
  v.literal("room"),
  v.literal("community"),
  v.literal("track")
);

async function resolveReportedUserId(
  ctx: MutationCtx,
  targetType: "profile" | "post" | "comment" | "message" | "room" | "community" | "track",
  targetId: string
): Promise<Id<"profiles"> | undefined> {
  if (targetType === "profile") {
    const profile = await ctx.db.get(targetId as Id<"profiles">);
    if (!profile) throw new Error("REPORT_TARGET_NOT_FOUND: Profile not found");
    return profile._id;
  }
  if (targetType === "post") {
    const post = await ctx.db.get(targetId as Id<"posts">);
    if (!post) throw new Error("REPORT_TARGET_NOT_FOUND: Post not found");
    return post.authorId;
  }
  if (targetType === "comment") {
    const comment = await ctx.db.get(targetId as Id<"comments">);
    if (!comment) throw new Error("REPORT_TARGET_NOT_FOUND: Comment not found");
    return comment.authorId;
  }
  if (targetType === "message") {
    const message = await ctx.db.get(targetId as Id<"messages">);
    if (!message) throw new Error("REPORT_TARGET_NOT_FOUND: Message not found");
    return message.senderId;
  }
  if (targetType === "room") {
    const room = await ctx.db.get(targetId as Id<"rooms">);
    if (!room) throw new Error("REPORT_TARGET_NOT_FOUND: Room not found");
    return room.hostId;
  }
  if (targetType === "community") {
    const community = await ctx.db.get(targetId as Id<"communities">);
    if (!community) throw new Error("REPORT_TARGET_NOT_FOUND: Community not found");
    return community.ownerId;
  }
  const track = await ctx.db.get(targetId as Id<"my_tracks">);
  if (!track) throw new Error("REPORT_TARGET_NOT_FOUND: Track not found");
  return track.ownerId;
}

export const create = mutation({
  args: {
    targetType: targetTypeValidator,
    targetId: v.string(),
    reason: reportReasonValidator,
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    await checkRateLimit(ctx, "reportAction", profile._id);

    const details = sanitizeText(args.details);
    validateTextLength(details, 1000, "Report details");

    const reportedUserId = await resolveReportedUserId(ctx, args.targetType, args.targetId);
    if (reportedUserId === profile._id) {
      throw new Error("REPORT_SELF: You cannot report your own content");
    }

    const existing = await ctx.db
      .query("reports")
      .withIndex("by_reporter_and_target", (q) =>
        q
          .eq("reporterId", profile._id)
          .eq("targetType", args.targetType)
          .eq("targetId", args.targetId)
      )
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        reason: args.reason,
        details,
        status: "open",
        updatedAt: now,
      });
      return { id: existing._id, status: "open" as const };
    }

    const id = await ctx.db.insert("reports", {
      reporterId: profile._id,
      reportedUserId,
      targetType: args.targetType,
      targetId: args.targetId,
      reason: args.reason,
      details,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });

    return { id, status: "open" as const };
  },
});
