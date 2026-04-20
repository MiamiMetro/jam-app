import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import CommentComposer from "@/components/comments/CommentComposer";
import CommentItem from "@/components/comments/CommentItem";
import AudioPostPlayer from "@/components/posts/AudioPostPlayer";
import type { RootStackParamList } from "@/navigation/RootNavigator";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useMobileTheme } from "@/theme/MobileTheme";
import { api } from "@jam-app/convex";
import type { Id } from "@jam-app/convex";

type Props = NativeStackScreenProps<RootStackParamList, "PostDetail">;

export default function PostDetailScreen({ navigation, route }: Props) {
  const { colors } = useMobileTheme();
  const { postId } = route.params;
  const post = useQuery(api.posts.getById, { postId: postId as Id<"posts"> });
  const { profile } = useMyProfile();
  const createComment = useMutation(api.comments.create);
  const toggleLike = useMutation(api.posts.toggleLike);
  const removePost = useMutation(api.posts.remove);
  const commentsQuery = usePaginatedQuery(
    api.comments.getByPostPaginated,
    { postId: postId as Id<"posts"> },
    { initialNumItems: 20 }
  );
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [isPostLikeSubmitting, setIsPostLikeSubmitting] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  const topLevelComments = useMemo(
    () =>
      commentsQuery.results.filter(
        (comment) => comment.depth === 0 && (!comment.deleted_at || comment.replies_count > 0)
      ),
    [commentsQuery.results]
  );

  const authorName = post?.author?.username ?? "unknown";
  const isOwnPost = profile?.id === post?.author_id;
  const createdAt = useMemo(
    () => (post?.created_at ? formatRelativeTime(post.created_at) : ""),
    [post?.created_at]
  );
  const fallbackLetters = useMemo(
    () => authorName.slice(0, 2).toUpperCase(),
    [authorName]
  );

  const handleCreateComment = async (text: string) => {
    try {
      setIsCommentSubmitting(true);
      await createComment({
        postId: postId as Id<"posts">,
        text,
      });
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const handleTogglePostLike = async () => {
    if (!post || isPostLikeSubmitting) return;
    try {
      setIsPostLikeSubmitting(true);
      await toggleLike({ postId: post.id as Id<"posts"> });
    } finally {
      setIsPostLikeSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post || !isOwnPost || isDeletingPost) return;

    try {
      setIsDeletingPost(true);
      await removePost({ postId: post.id as Id<"posts"> });
      navigation.goBack();
    } finally {
      setIsDeletingPost(false);
    }
  };

  if (post === undefined) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
            Loading post...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons color={colors.secondaryForeground} name="arrow-back" size={20} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.secondaryForeground }]}>
            Post
          </Text>
        </View>
        <View style={styles.centerState}>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Post not found
          </Text>
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
            It may have been deleted.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons color={colors.secondaryForeground} name="arrow-back" size={20} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.secondaryForeground }]}>
          Post by {authorName}
        </Text>
        {isOwnPost ? (
          <Pressable
            disabled={isDeletingPost}
            onPress={handleDeletePost}
            style={styles.deleteButton}
          >
            <Ionicons
              color={isDeletingPost ? colors.muted : colors.mutedForeground}
              name="trash-outline"
              size={20}
            />
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.postBlock, { borderBottomColor: colors.border }]}>
          <View style={styles.postHeader}>
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
            <View style={styles.postMeta}>
              <Text style={[styles.author, { color: colors.foreground }]}>
                {authorName}
              </Text>
              <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
                {createdAt}
              </Text>
            </View>
          </View>

          {post.text ? (
            <Text style={[styles.postText, { color: colors.foreground }]}>{post.text}</Text>
          ) : null}

          {post.audio_url ? (
            <AudioPostPlayer
              audioUrl={post.audio_url}
              duration={post.audio_duration}
              style={styles.audioPlayer}
              title={post.audio_title}
            />
          ) : null}

          <View style={[styles.postActions, { borderTopColor: colors.border }]}>
            <Pressable onPress={handleTogglePostLike} style={styles.action}>
              <Ionicons
                color={post.is_liked ? "#EF4444" : colors.mutedForeground}
                name={post.is_liked ? "heart" : "heart-outline"}
                size={20}
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
            <View style={styles.action}>
              <Ionicons color={colors.mutedForeground} name="chatbubble-outline" size={19} />
              <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
                {post.comments_count}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.commentsHeader}>
          <View style={[styles.commentsAccent, { backgroundColor: colors.primary }]} />
          <Text style={[styles.commentsTitle, { color: colors.foreground }]}>Comments</Text>
          <Text style={[styles.commentsCount, { color: colors.mutedForeground }]}>
            ({topLevelComments.length})
          </Text>
        </View>

        <View style={styles.composerWrap}>
          <CommentComposer
            isSubmitting={isCommentSubmitting}
            onSubmit={handleCreateComment}
            placeholder="Write a comment..."
          />
        </View>

        {commentsQuery.status === "LoadingFirstPage" ? (
          <View style={styles.centerStateInline}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
              Loading comments...
            </Text>
          </View>
        ) : topLevelComments.length === 0 ? (
          <View style={styles.centerStateInline}>
            <Ionicons
              color={colors.mutedForeground}
              name="chatbubble-ellipses-outline"
              size={34}
            />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No comments yet
            </Text>
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
              Be the first to comment.
            </Text>
          </View>
        ) : (
          <View style={[styles.commentsList, { borderTopColor: colors.border }]}>
            {topLevelComments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} currentProfile={profile} />
            ))}
          </View>
        )}

        {commentsQuery.status === "CanLoadMore" ? (
          <Pressable onPress={() => commentsQuery.loadMore(20)} style={styles.loadMoreButton}>
            <Text style={[styles.loadMoreText, { color: colors.primary }]}>
              Load more comments
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
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
    flex: 1,
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  backButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  deleteButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  headerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  postBlock: {
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  postHeader: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    overflow: "hidden",
    width: 48,
  },
  avatarImage: {
    height: 48,
    width: 48,
  },
  avatarFallback: {
    fontSize: 14,
    fontWeight: "800",
  },
  postMeta: {
    flex: 1,
    justifyContent: "center",
  },
  author: {
    fontSize: 17,
    fontWeight: "800",
  },
  timestamp: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  postText: {
    fontSize: 16,
    lineHeight: 24,
  },
  audioPlayer: {
    marginTop: 14,
  },
  postActions: {
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 22,
    marginTop: 18,
    paddingTop: 14,
  },
  action: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "800",
  },
  likedText: {
    color: "#EF4444",
  },
  commentsHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  commentsAccent: {
    borderRadius: 2,
    height: 18,
    width: 4,
  },
  commentsTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  commentsCount: {
    fontSize: 13,
    fontWeight: "700",
  },
  composerWrap: {
    paddingBottom: 14,
    paddingHorizontal: 18,
  },
  commentsList: {
    borderTopWidth: 1,
  },
  centerState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  centerStateInline: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 46,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 10,
    textAlign: "center",
  },
  stateText: {
    marginTop: 8,
    textAlign: "center",
  },
  loadMoreButton: {
    alignItems: "center",
    paddingVertical: 16,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
