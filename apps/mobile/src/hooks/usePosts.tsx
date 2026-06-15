import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@jam-app/convex";
import type { Id } from "@jam-app/convex";
import type { Comment, Post } from "@/types";
import { getNativeAvatarUri } from "@/utils/avatar";

type MutationOptions<T = void> = {
  onError?: (error: Error) => void;
  onSuccess?: (value: T) => void;
};

export interface FrontendPost {
  id: string;
  authorId?: string;
  author: {
    avatar?: string;
    username: string;
  };
  audioFile?: {
    duration: number;
    title: string;
    url: string;
  };
  audio_url?: string | null;
  comments?: number;
  communityHandle?: string | null;
  communityId?: string | null;
  communityThemeColor?: string | null;
  content?: string;
  isDeleted?: boolean;
  isLiked?: boolean;
  likes: number;
  text?: string;
  timestamp: Date;
}

export interface FrontendComment {
  audioFile?: {
    duration: number;
    title: string;
    url: string;
  };
  audio_url?: string | null;
  author: {
    avatar?: string;
    username: string;
  };
  content?: string;
  depth?: number;
  id: string;
  authorId?: string;
  isDeleted?: boolean;
  isLiked?: boolean;
  likes?: number;
  parentId?: string | null;
  path?: string;
  postId: string;
  repliesCount?: number;
  timestamp: Date;
}

function convertPost(post: Post): FrontendPost {
  return {
    id: post.id,
    authorId: post.author_id,
    author: {
      username: post.author?.username || "unknown",
      avatar: getNativeAvatarUri(post.author?.avatar_url) || undefined,
    },
    content: post.text || "",
    text: post.text,
    audio_url: post.audio_url || null,
    audioFile: post.audio_url
      ? {
          url: post.audio_url,
          title: post.audio_title || "Audio",
          duration: post.audio_duration || 0,
        }
      : undefined,
    timestamp: new Date(post.created_at),
    likes: post.likes_count || 0,
    isLiked: post.is_liked || false,
    comments: post.comments_count || 0,
    communityId: post.community_id ?? null,
    communityHandle: post.community_handle ?? null,
    communityThemeColor: post.community_theme_color ?? null,
    isDeleted: post.deleted_at != null,
  };
}

function convertComment(comment: Comment): FrontendComment {
  return {
    id: comment.id,
    authorId: comment.author_id,
    postId: comment.post_id,
    parentId: comment.parent_id ?? null,
    path: comment.path,
    depth: comment.depth ?? 0,
    author: {
      username: comment.author?.username || "unknown",
      avatar: getNativeAvatarUri(comment.author?.avatar_url) || undefined,
    },
    content: comment.text || "",
    audio_url: comment.audio_url || null,
    audioFile: comment.audio_url
      ? {
          url: comment.audio_url,
          title: comment.audio_title || "Audio",
          duration: comment.audio_duration || 0,
        }
      : undefined,
    timestamp: new Date(comment.created_at),
    isLiked: comment.is_liked || false,
    likes: comment.likes_count || 0,
    repliesCount: comment.replies_count || 0,
    isDeleted: comment.deleted_at != null,
  };
}

function getPaginatedStatusFlags(status: string) {
  return {
    canLoadMore: status === "CanLoadMore",
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
    isLoading: status === "LoadingFirstPage",
    isLoadingMore: status === "LoadingMore",
  };
}

export function usePosts() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.getFeedPaginated,
    {},
    { initialNumItems: 20 }
  );
  const flags = getPaginatedStatusFlags(status);

  return {
    data: results.map(convertPost),
    posts: results,
    ...flags,
    fetchNextPage: () => loadMore(20),
    loadMore,
    refetch: () => {},
  };
}

export function useCommunityPosts(communityId: string | undefined) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.getCommunityPostsPaginated,
    communityId ? { communityId: communityId as Id<"communities"> } : "skip",
    { initialNumItems: 20 }
  );
  const flags = getPaginatedStatusFlags(status);

  return {
    data: results.map(convertPost),
    posts: results,
    ...flags,
    fetchNextPage: () => loadMore(20),
    loadMore,
    refetch: () => {},
  };
}

export function useGlobalPosts() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.getFeedPaginated,
    {},
    { initialNumItems: 20 },
  );
  const flags = getPaginatedStatusFlags(status);

  return {
    data: results.map(convertPost).filter((post) => !post.communityId),
    posts: results,
    ...flags,
    fetchNextPage: () => loadMore(20),
    loadMore,
    refetch: () => {},
  };
}

export function usePost(postId: string | undefined) {
  const result = useQuery(
    api.posts.getById,
    postId ? { postId: postId as Id<"posts"> } : "skip",
  );

  return {
    data: result ? convertPost(result) : null,
    error: null,
    isLoading: result === undefined && !!postId,
    refetch: () => {},
  };
}

export function useComments(postId: string | undefined) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.comments.getByPostPaginated,
    postId ? { postId: postId as Id<"posts"> } : "skip",
    { initialNumItems: 20 },
  );
  const flags = getPaginatedStatusFlags(status);

  return {
    data: results.map(convertComment),
    ...flags,
    fetchNextPage: () => loadMore(20),
    refetch: () => {},
  };
}

export function useCreateComment() {
  const createComment = useMutation(api.comments.create);
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: { audioDuration?: number; audioTitle?: string; audioUrl?: string; content: string; postId: string }) => {
    setIsPending(true);
    try {
      const result = await createComment({
        postId: variables.postId as Id<"posts">,
        text: variables.content || undefined,
        audioUrl: variables.audioUrl,
        audioTitle: variables.audioTitle,
        audioDuration: variables.audioDuration,
      });
      return convertComment(result);
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutate: (variables: Parameters<typeof run>[0], options?: MutationOptions<FrontendComment>) => {
      run(variables).then((value) => options?.onSuccess?.(value)).catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
  };
}

export function useCreatePost() {
  const createPost = useMutation(api.posts.create);
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: {
    audioDuration?: number;
    audioTitle?: string;
    audioUrl?: string;
    communityId?: string | null;
    content: string;
  }) => {
    setIsPending(true);
    try {
      const result = await createPost({
        text: variables.content || undefined,
        audio_url: variables.audioUrl,
        audio_title: variables.audioTitle,
        audio_duration: variables.audioDuration,
        community_id: variables.communityId ? (variables.communityId as Id<"communities">) : undefined,
      });
      return convertPost(result);
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutate: (variables: Parameters<typeof run>[0], options?: MutationOptions<FrontendPost>) => {
      run(variables).then((value) => options?.onSuccess?.(value)).catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
  };
}

export function useDeletePost() {
  const deletePost = useMutation(api.posts.remove);
  const [isPending, setIsPending] = useState(false);

  const run = async (postId: string) => {
    setIsPending(true);
    try {
      await deletePost({ postId: postId as Id<"posts"> });
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutate: (postId: string, options?: MutationOptions) => {
      run(postId).then(() => options?.onSuccess?.()).catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
  };
}

export function useToggleLike() {
  const toggleLike = useMutation(api.posts.toggleLike);
  const [isPending, setIsPending] = useState(false);

  const run = async (postId: string) => {
    setIsPending(true);
    try {
      return convertPost(await toggleLike({ postId: postId as Id<"posts"> }));
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutate: (postId: string, options?: MutationOptions<FrontendPost>) => {
      run(postId).then((value) => options?.onSuccess?.(value)).catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
  };
}

export function useToggleCommentLike() {
  const toggleLike = useMutation(api.comments.toggleLike);
  const [isPending, setIsPending] = useState(false);

  const run = async (commentId: string) => {
    setIsPending(true);
    try {
      return convertComment(await toggleLike({ commentId: commentId as Id<"comments"> }));
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutate: (commentId: string, options?: MutationOptions<FrontendComment>) => {
      run(commentId).then((value) => options?.onSuccess?.(value)).catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
  };
}

export function useDeleteComment() {
  const deleteComment = useMutation(api.comments.remove);
  const [isPending, setIsPending] = useState(false);

  const run = async (commentId: string) => {
    setIsPending(true);
    try {
      await deleteComment({ commentId: commentId as Id<"comments"> });
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutate: (commentId: string, options?: MutationOptions) => {
      run(commentId).then(() => options?.onSuccess?.()).catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
  };
}

export function usePostLikes(postId: string | null) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.getLikes,
    postId ? { postId: postId as Id<"posts"> } : "skip",
    { initialNumItems: 20 },
  );
  const flags = getPaginatedStatusFlags(status);

  return {
    data: results as Array<{
      avatar_url?: string | null;
      display_name?: string | null;
      id: string;
      liked_at: string;
      username: string;
    }>,
    ...flags,
    fetchNextPage: () => loadMore(20),
  };
}

export function useUserPosts(username: string) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.getByUsernamePaginated,
    username ? { username } : "skip",
    { initialNumItems: 20 },
  );
  const flags = getPaginatedStatusFlags(status);

  return {
    data: results.map(convertPost),
    ...flags,
    fetchNextPage: () => loadMore(20),
    refetch: () => {},
  };
}

export function useReplies(parentId: string | null) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.comments.getRepliesPaginated,
    parentId ? { parentId: parentId as Id<"comments"> } : "skip",
    { initialNumItems: 10 },
  );
  const flags = getPaginatedStatusFlags(status);

  return {
    data: results.map(convertComment),
    ...flags,
    fetchNextPage: () => loadMore(10),
  };
}

export function useCreateReply() {
  const replyMutation = useMutation(api.comments.reply);
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: { audioDuration?: number; audioTitle?: string; audioUrl?: string; content: string; parentId: string }) => {
    setIsPending(true);
    try {
      const result = await replyMutation({
        parentId: variables.parentId as Id<"comments">,
        text: variables.content || undefined,
        audioUrl: variables.audioUrl,
        audioTitle: variables.audioTitle,
        audioDuration: variables.audioDuration,
      });
      return convertComment(result);
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutate: (variables: Parameters<typeof run>[0], options?: MutationOptions<FrontendComment>) => {
      run(variables).then((value) => options?.onSuccess?.(value)).catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
  };
}

export type ReportTargetType = "profile" | "post" | "comment" | "message" | "room" | "community" | "track";
export type ReportReason =
  | "harassment"
  | "hate"
  | "sexual_content"
  | "violence"
  | "spam"
  | "impersonation"
  | "illegal"
  | "other";

export function useReportContent() {
  const report = useMutation(api.reports.create);
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: {
    details?: string;
    reason: ReportReason;
    targetId: string;
    targetType: ReportTargetType;
  }) => {
    setIsPending(true);
    try {
      return await report(variables);
    } finally {
      setIsPending(false);
    }
  };

  return { isPending, mutateAsync: run };
}
