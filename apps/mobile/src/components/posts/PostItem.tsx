import React, { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useMutation } from "convex/react";
import AudioPostPlayer from "@/components/posts/AudioPostPlayer";
import type { PostFeedItem } from "@/types";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useMobileTheme } from "@/theme/MobileTheme";
import { api } from "@jam-app/convex";
import type { Id } from "@jam-app/convex";

type Props = {
  post: PostFeedItem;
};

export default function PostItem({ post }: Props) {
  const navigation = useNavigation<any>();
  const { colors } = useMobileTheme();
  const removePost = useMutation(api.posts.remove);
  const toggleLike = useMutation(api.posts.toggleLike);
  const { profile } = useMyProfile();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const authorName = post.author?.username ?? "unknown";
  const isOwnPost = profile?.id === post.author_id;
  const fallbackLetters = useMemo(
    () => authorName.slice(0, 2).toUpperCase(),
    [authorName]
  );
  const createdAt = useMemo(() => formatRelativeTime(post.created_at), [post.created_at]);

  if (post.deleted_at) {
    return null;
  }

  const handleDelete = async () => {
    if (!isOwnPost || isDeleting) return;

    try {
      setIsDeleting(true);
      await removePost({ postId: post.id as Id<"posts"> });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleLike = async () => {
    if (isLiking) return;

    try {
      setIsLiking(true);
      await toggleLike({ postId: post.id as Id<"posts"> });
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <Pressable
      onPress={() => navigation.navigate("PostDetail", { postId: post.id })}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed ? colors.cardPressed : colors.background,
          borderBottomColor: colors.border,
          borderLeftColor: pressed ? colors.primary : "transparent",
        },
      ]}
    >
      <View
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
      </View>

      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Text style={[styles.author, { color: colors.foreground }]}>{authorName}</Text>
          {isOwnPost ? (
            <Pressable
              disabled={isDeleting}
              onPress={(event) => {
                event.stopPropagation();
                handleDelete();
              }}
              style={styles.deleteButton}
            >
              <Ionicons
                color={isDeleting ? colors.muted : colors.mutedForeground}
                name="trash-outline"
                size={14}
              />
            </Pressable>
          ) : null}
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
          <Text style={[styles.content, { color: colors.foreground }]}>{post.text}</Text>
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
            disabled={isLiking}
            onPress={(event) => {
              event.stopPropagation();
              handleToggleLike();
            }}
            style={styles.actionButton}
          >
            <Ionicons
              color={post.is_liked ? "#EF6F6C" : colors.mutedForeground}
              name={post.is_liked ? "heart" : "heart-outline"}
              size={15}
            />
            <Text
              style={[
                styles.actionText,
                { color: colors.mutedForeground },
                post.is_liked ? styles.likedText : null,
              ]}
            >
              {post.likes_count}
            </Text>
          </Pressable>
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              navigation.navigate("PostDetail", { postId: post.id });
            }}
            style={styles.actionButton}
          >
            <Ionicons color={colors.mutedForeground} name="chatbubble-outline" size={14} />
            <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
              Comments {post.comments_count}
            </Text>
          </Pressable>
          <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
            Share
          </Text>
        </View>
      </View>
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
  deleteButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 28,
    justifyContent: "center",
    marginLeft: "auto",
    width: 28,
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
  likedText: {
    color: "#EF6F6C",
  },
});
