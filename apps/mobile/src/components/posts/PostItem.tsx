import React, { useMemo, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AudioPostPlayer from "@/components/posts/AudioPostPlayer";
import type { PostFeedItem } from "@/types";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useDeletePost, useReportContent, useToggleLike } from "@/hooks/usePosts";
import { useBlockUser } from "@/hooks/useUsers";
import { useMobileTheme } from "@/theme/MobileTheme";

type Props = {
  post: PostFeedItem;
};

export default function PostItem({ post }: Props) {
  const navigation = useNavigation<any>();
  const { colors } = useMobileTheme();
  const removePost = useDeletePost();
  const toggleLike = useToggleLike();
  const reportContent = useReportContent();
  const blockUser = useBlockUser();
  const { profile } = useMyProfile();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const authorName = post.author?.username ?? "unknown";
  const isOwnPost = profile?.id === post.author_id;
  const fallbackLetters = useMemo(
    () => authorName.slice(0, 2).toUpperCase(),
    [authorName]
  );
  const createdAt = useMemo(() => formatRelativeTime(post.created_at), [post.created_at]);
  const postLabel = [
    `Post by ${authorName}`,
    post.community_handle ? `in ${post.community_handle}` : null,
    createdAt,
    post.text,
    post.audio_url ? "Audio attached" : null,
    `${post.likes_count} likes`,
    `${post.comments_count} comments`,
  ]
    .filter(Boolean)
    .join(", ");

  if (post.deleted_at) {
    return null;
  }

  const handleDelete = async () => {
    if (!isOwnPost || isDeleting) return;

    try {
      setIsDeleting(true);
      await removePost.mutateAsync(post.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleLike = async () => {
    if (isLiking) return;

    try {
      setIsLiking(true);
      await toggleLike.mutateAsync(post.id);
    } finally {
      setIsLiking(false);
    }
  };

  const handleReport = async () => {
    setMenuOpen(false);
    Alert.alert("Report post", "Send this post to Jam for review?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report",
        style: "destructive",
        onPress: async () => {
          await reportContent.mutateAsync({
            targetType: "post",
            targetId: post.id,
            reason: "other",
          });
          setReportSubmitted(true);
          setTimeout(() => setReportSubmitted(false), 1000);
        },
      },
    ]);
  };

  const handleBlock = async () => {
    if (!post.author_id) return;
    setMenuOpen(false);
    await blockUser.mutateAsync(post.author_id);
  };

  const openAuthorProfile = () => {
    if (post.author?.username) {
      navigation.navigate("UserProfile", { username: post.author.username });
    }
  };

  const openPostDetail = () => {
    navigation.navigate("PostDetail", { postId: post.id });
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          borderLeftColor: "transparent",
        },
      ]}
    >
      <Pressable
        accessibilityLabel={`Open ${authorName}'s profile`}
        accessibilityRole="button"
        onPress={openAuthorProfile}
        style={[
          styles.avatar,
          { backgroundColor: colors.muted, borderColor: colors.border },
        ]}
      >
        {post.author?.avatar_url && !avatarFailed ? (
          <Image
            onError={() => setAvatarFailed(true)}
            source={{ uri: post.author.avatar_url }}
            style={styles.avatarImage}
          />
        ) : (
          <Text style={[styles.avatarFallback, { color: colors.secondaryForeground }]}>
            {fallbackLetters}
          </Text>
        )}
      </Pressable>

      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Pressable
            accessibilityLabel={`Open ${authorName}'s profile`}
            accessibilityRole="button"
            onPress={openAuthorProfile}
            style={styles.authorButton}
          >
            <Text style={[styles.author, { color: colors.foreground }]}>{authorName}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`View ${authorName}'s profile`}
            accessibilityRole="button"
            onPress={openAuthorProfile}
            style={[styles.viewProfileButton, { backgroundColor: colors.muted }]}
          >
            <Text style={[styles.viewProfileText, { color: colors.secondaryForeground }]}>
              View profile
            </Text>
          </Pressable>
          <View style={styles.menuWrap}>
            <Pressable
              accessibilityLabel="Post actions"
              accessibilityRole="button"
              onPress={() => setMenuOpen((value) => !value)}
              style={styles.iconButton}
            >
              <Ionicons
                accessibilityElementsHidden
                color={reportSubmitted ? colors.success : colors.mutedForeground}
                importantForAccessibility="no-hide-descendants"
                name={reportSubmitted ? "checkmark" : "ellipsis-horizontal"}
                size={16}
              />
            </Pressable>
            {menuOpen ? (
              <View style={[styles.menu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {isOwnPost ? (
                  <MenuAction
                    color={colors.destructive}
                    disabled={isDeleting}
                    icon="trash-outline"
                    label="Delete"
                    onPress={async () => {
                      setMenuOpen(false);
                      await handleDelete();
                    }}
                  />
                ) : (
                  <>
                    <MenuAction color={colors.destructive} icon="flag-outline" label="Report" onPress={handleReport} />
                    <MenuAction color={colors.destructive} icon="ban-outline" label="Block user" onPress={handleBlock} />
                  </>
                )}
              </View>
            ) : null}
          </View>
          {post.community_handle ? (
            <View style={[styles.communityBadge, { backgroundColor: colors.accentMuted }]}>
              <Text style={[styles.communityText, { color: colors.primary }]}>
                #{post.community_handle}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
            - {createdAt}
          </Text>
        </View>

        {post.text ? (
          <Pressable
            accessibilityLabel={postLabel}
            accessibilityRole="button"
            onPress={openPostDetail}
          >
            <Text style={[styles.content, { color: colors.foreground }]}>{post.text}</Text>
          </Pressable>
        ) : null}

        {post.audio_url ? (
          <AudioPostPlayer
            audioUrl={post.audio_url}
            duration={post.audio_duration}
            style={styles.audioPlayer}
            title={post.audio_title}
          />
        ) : null}

        <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
          <Pressable
            accessibilityLabel={post.is_liked ? "Unlike post" : "Like post"}
            accessibilityRole="button"
            disabled={isLiking}
            onPress={(event) => {
              event.stopPropagation();
              handleToggleLike();
            }}
            style={styles.actionButton}
          >
            <Ionicons
              accessibilityElementsHidden
              color={post.is_liked ? colors.destructive : colors.mutedForeground}
              importantForAccessibility="no-hide-descendants"
              name={post.is_liked ? "heart" : "heart-outline"}
              size={15}
            />
            <Text
              style={[
                styles.actionText,
                { color: colors.mutedForeground },
                post.is_liked ? { color: colors.destructive } : null,
              ]}
            >
              {post.likes_count}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`Open comments, ${post.comments_count} comments`}
            accessibilityRole="button"
            onPress={openPostDetail}
            style={styles.actionButton}
          >
            <Ionicons
              accessibilityElementsHidden
              color={colors.mutedForeground}
              importantForAccessibility="no-hide-descendants"
              name="chatbubble-outline"
              size={14}
            />
            <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
              Comments {post.comments_count}
            </Text>
          </Pressable>
          <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
            Share
          </Text>
        </View>
      </View>
    </View>
  );
}

function MenuAction({
  color,
  disabled,
  icon,
  label,
  onPress,
}: {
  color: string;
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void | Promise<void>;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={styles.menuAction}
    >
      <Ionicons color={color} name={icon} size={15} />
      <Text style={[styles.menuActionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

function formatRelativeTime(value: string) {
  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) return "";

  const diffSeconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
  if (diffSeconds < 60) return "now";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  return new Date(value).toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderLeftWidth: 2,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    overflow: "hidden",
    width: 44,
  },
  avatarImage: {
    height: 44,
    width: 44,
  },
  avatarFallback: {
    fontSize: 13,
    fontWeight: "800",
  },
  authorButton: {
    borderRadius: 6,
    marginLeft: -2,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 8,
  },
  author: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  viewProfileButton: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  viewProfileText: {
    fontSize: 11,
    fontWeight: "800",
  },
  deleteButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 28,
    justifyContent: "center",
    marginLeft: "auto",
    width: 28,
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  menu: {
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 134,
    padding: 5,
    position: "absolute",
    right: 0,
    top: 32,
    zIndex: 20,
  },
  menuAction: {
    alignItems: "center",
    borderRadius: 7,
    flexDirection: "row",
    gap: 8,
    minHeight: 34,
    paddingHorizontal: 9,
  },
  menuActionText: {
    fontSize: 13,
    fontWeight: "800",
  },
  menuWrap: {
    marginLeft: "auto",
    position: "relative",
  },
  communityBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  communityText: {
    fontSize: 11,
    fontWeight: "800",
  },
  timestamp: {
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  audioPlayer: {
    marginBottom: 12,
  },
  actionsRow: {
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 20,
    paddingTop: 11,
  },
  actionButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
