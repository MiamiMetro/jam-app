import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { User } from "@/types";
import {
  useCreateReply,
  useDeleteComment,
  useReplies,
  useToggleCommentLike,
  type FrontendComment,
} from "@/hooks/usePosts";
import CommentComposer from "./CommentComposer";
import { useMobileTheme } from "@/theme/MobileTheme";

type Props = {
  comment: FrontendComment;
  currentProfile: User | null | undefined;
  depth?: number;
};

const INDENT_WIDTH = 16;
const MAX_VISIBLE_DEPTH = 4;

export default function CommentItem({ comment, currentProfile, depth = 0 }: Props) {
  const { colors } = useMobileTheme();
  const toggleLike = useToggleCommentLike();
  const deleteComment = useDeleteComment();
  const createReply = useCreateReply();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [replying, setReplying] = useState(false);
  const [isReplySubmitting, setIsReplySubmitting] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const repliesQuery = useReplies(repliesExpanded ? comment.id : null);

  const authorName = comment.author?.username ?? "unknown";
  const isOwn = currentProfile?.username === authorName;
  const isDeleted = Boolean(comment.isDeleted);
  const visibleReplies = useMemo(
    () => repliesQuery.data.filter((reply) => !reply.isDeleted || (reply.repliesCount ?? 0) > 0),
    [repliesQuery.data]
  );
  const fallbackLetters = useMemo(
    () => authorName.slice(0, 2).toUpperCase(),
    [authorName]
  );
  const createdAt = useMemo(() => formatRelativeTime(comment.timestamp), [comment.timestamp]);

  const handleToggleLike = async () => {
    if (isDeleted || isMutating) return;
    try {
      setIsMutating(true);
      await toggleLike.mutateAsync(comment.id);
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async () => {
    if (!isOwn || isMutating) return;
    try {
      setIsMutating(true);
      await deleteComment.mutateAsync(comment.id);
    } finally {
      setIsMutating(false);
    }
  };

  const handleReply = async (text: string) => {
    try {
      setIsReplySubmitting(true);
      await createReply.mutateAsync({ parentId: comment.id, content: text });
      setReplying(false);
      setRepliesExpanded(true);
    } finally {
      setIsReplySubmitting(false);
    }
  };

  const leftOffset = Math.min(depth, MAX_VISIBLE_DEPTH) * INDENT_WIDTH;

  return (
    <View
      style={[
        styles.wrapper,
        { borderBottomColor: colors.border, marginLeft: leftOffset },
      ]}
    >
      <View style={[styles.row, depth > 0 ? styles.replyRow : null]}>
        {depth > 0 ? (
          <View style={[styles.threadLine, { backgroundColor: colors.borderStrong }]} />
        ) : null}

        <View
          style={[
            styles.avatar,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
        >
          {comment.author?.avatar && !avatarFailed && !isDeleted ? (
            <Image
              onError={() => setAvatarFailed(true)}
              source={{ uri: comment.author.avatar }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={[styles.avatarFallback, { color: colors.secondaryForeground }]}>
              {isDeleted ? "--" : fallbackLetters}
            </Text>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <Text style={[styles.author, { color: colors.foreground }]}>
              {isDeleted ? "deleted" : authorName}
            </Text>
            <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
              - {createdAt}
            </Text>
          </View>

          {isDeleted ? (
            <Text style={[styles.deletedText, { color: colors.mutedForeground }]}>
              Comment removed
            </Text>
          ) : (
            <Text style={[styles.content, { color: colors.foreground }]}>
              {comment.content}
            </Text>
          )}

          <View style={styles.actionsRow}>
            <Pressable
              accessibilityLabel={`${comment.isLiked ? "Unlike" : "Like"} comment. ${comment.likes} likes`}
              accessibilityRole="button"
              disabled={isDeleted || isMutating}
              onPress={handleToggleLike}
              style={styles.action}
            >
              <Ionicons
                accessibilityElementsHidden
                color={comment.isLiked ? colors.destructive : colors.mutedForeground}
                importantForAccessibility="no-hide-descendants"
                name={comment.isLiked ? "heart" : "heart-outline"}
                size={15}
              />
              <Text
                style={[
                  styles.actionText,
                  { color: colors.mutedForeground },
                  comment.isLiked ? { color: colors.destructive } : null,
                ]}
              >
                {comment.likes}
              </Text>
            </Pressable>

            {!isDeleted ? (
              <Pressable
                accessibilityLabel="Reply to comment"
                accessibilityRole="button"
                onPress={() => setReplying((value) => !value)}
                style={styles.action}
              >
                <Ionicons
                  accessibilityElementsHidden
                  color={colors.mutedForeground}
                  importantForAccessibility="no-hide-descendants"
                  name="chatbubble-outline"
                  size={14}
                />
                <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
                  Reply
                </Text>
              </Pressable>
            ) : null}

            {(comment.repliesCount ?? 0) > 0 ? (
              <Pressable
                accessibilityLabel={`${repliesExpanded ? "Hide" : "View"} ${comment.repliesCount} replies`}
                accessibilityRole="button"
                onPress={() => setRepliesExpanded((value) => !value)}
                style={styles.action}
              >
                <Text style={[styles.primaryActionText, { color: colors.primary }]}>
                  {repliesExpanded ? "Hide" : `View ${comment.repliesCount}`}
                </Text>
              </Pressable>
            ) : null}

            {isOwn && !isDeleted ? (
              <Pressable
                accessibilityLabel="Delete comment"
                accessibilityRole="button"
                disabled={isMutating}
                onPress={handleDelete}
                style={styles.action}
              >
                <Ionicons
                  accessibilityElementsHidden
                  color={colors.mutedForeground}
                  importantForAccessibility="no-hide-descendants"
                  name="trash-outline"
                  size={14}
                />
              </Pressable>
            ) : null}
          </View>

          {replying ? (
            <View style={styles.replyComposer}>
              <View style={styles.replyHeader}>
                <Text style={[styles.replyingText, { color: colors.mutedForeground }]}>
                  Replying to @{authorName}
                </Text>
                <Pressable
                  accessibilityLabel="Cancel reply"
                  accessibilityRole="button"
                  onPress={() => setReplying(false)}
                >
                  <Text style={[styles.cancelText, { color: colors.primary }]}>
                    Cancel
                  </Text>
                </Pressable>
              </View>
              <CommentComposer
                buttonLabel="Reply"
                initialValue={`@${authorName} `}
                isSubmitting={isReplySubmitting}
                onSubmit={handleReply}
                placeholder={`Reply to @${authorName}...`}
              />
            </View>
          ) : null}

          {repliesExpanded ? (
            <View style={styles.replies}>
              {repliesQuery.isLoading ? (
                <View style={styles.loadingReplies}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                    Loading replies...
                  </Text>
                </View>
              ) : (
                visibleReplies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    currentProfile={currentProfile}
                    depth={depth + 1}
                  />
                ))
              )}

              {repliesQuery.hasNextPage ? (
                <Pressable
                  onPress={repliesQuery.fetchNextPage}
                  style={styles.loadMoreReplies}
                >
                  <Text style={[styles.primaryActionText, { color: colors.primary }]}>
                    Load more replies
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function formatRelativeTime(value: Date) {
  const createdAt = value.getTime();
  if (Number.isNaN(createdAt)) return "";

  const diffSeconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
  if (diffSeconds < 60) return "now";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  return value.toLocaleDateString();
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  replyRow: {
    paddingLeft: 0,
  },
  threadLine: {
    borderRadius: 1,
    width: 2,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 17,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    overflow: "hidden",
    width: 34,
  },
  avatarImage: {
    height: 34,
    width: 34,
  },
  avatarFallback: {
    fontSize: 11,
    fontWeight: "800",
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    marginBottom: 5,
  },
  author: {
    fontSize: 13,
    fontWeight: "800",
  },
  timestamp: {
    fontSize: 11,
    fontWeight: "600",
  },
  content: {
    fontSize: 14,
    lineHeight: 21,
  },
  deletedText: {
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 20,
  },
  actionsRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 9,
  },
  action: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "700",
  },
  primaryActionText: {
    fontSize: 12,
    fontWeight: "800",
  },
  replyComposer: {
    marginTop: 12,
  },
  replyHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  replyingText: {
    fontSize: 12,
    fontWeight: "700",
  },
  cancelText: {
    fontSize: 12,
    fontWeight: "800",
  },
  replies: {
    marginTop: 8,
  },
  loadingReplies: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: "700",
  },
  loadMoreReplies: {
    paddingVertical: 10,
  },
});
