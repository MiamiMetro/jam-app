import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@jam-app/convex";
import type { Id } from "@jam-app/convex";
import { useAuthStore } from "@/stores/authStore";
import { useR2Upload } from "@/hooks/useR2Upload";
import type { Comment, Post } from "@/lib/api/types";

/** Extract duration (seconds) from an audio File using a temporary Audio element. */
function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.addEventListener("loadedmetadata", () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      URL.revokeObjectURL(url);
      resolve(duration);
    });
    audio.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      resolve(0);
    });
  });
}

export interface FrontendPost {
  id: string;
  author: {
    username: string;
    avatar?: string;
  };
  content?: string;
  text?: string;
  audio_url?: string | null;
  audioFile?: {
    url: string;
    title: string;
    duration: number;
  };
  timestamp: Date;
  likes: number;
  isLiked?: boolean;
  comments?: number;
  communityId?: string | null;
  communityHandle?: string | null;
  communityThemeColor?: string | null;
  isDeleted?: boolean;
}

export interface FrontendComment {
  id: string;
  postId: string;
  parentId?: string | null;
  path?: string;
  depth?: number;
  author: {
    username: string;
    avatar?: string;
  };
  content?: string;
  audio_url?: string | null;
  audioFile?: {
    url: string;
    title: string;
    duration: number;
  };
  timestamp: Date;
  isLiked?: boolean;
  likes?: number;
  repliesCount?: number;
  isDeleted?: boolean;
}

type FriendMutationOptions = { onSuccess?: () => void; onError?: (error: Error) => void };

function convertPost(post: Post): FrontendPost {
  const isDeleted = post.deleted_at != null;
  return {
    id: post.id,
    author: {
      username: post.author?.username || "unknown",
      avatar: post.author?.avatar_url || undefined,
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
    isDeleted,
  };
}

function convertComment(comment: Comment): FrontendComment {
  const isDeleted = comment.deleted_at != null;
  return {
    id: comment.id,
    postId: comment.post_id,
    parentId: comment.parent_id ?? null,
    path: comment.path,
    depth: comment.depth ?? 0,
    author: {
      username: comment.author?.username || "unknown",
      avatar: comment.author?.avatar_url || undefined,
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
    isDeleted,
  };
}

function getPaginatedStatusFlags(status: string) {
  return {
    isLoading: status === "LoadingFirstPage",
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
  };
}

export const usePosts = () => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.getFeedPaginated,
    {},
    { initialNumItems: 20 }
  );

  const flags = getPaginatedStatusFlags(status);

  return {
    data: results.map(convertPost),
    ...flags,
    fetchNextPage: () => loadMore(20),
    refetch: () => {},
  };
};

export const useCommunityPosts = (communityId: string) => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.getCommunityPostsPaginated,
    communityId ? { communityId: communityId as Id<"communities"> } : "skip",
    { initialNumItems: 20 }
  );
  const flags = getPaginatedStatusFlags(status);
  return {
    data: results.map(convertPost),
    ...flags,
    fetchNextPage: () => loadMore(20),
    refetch: () => {},
  };
};

export const useGlobalPosts = () => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.getFeedPaginated,
    {},
    { initialNumItems: 20 }
  );
  const flags = getPaginatedStatusFlags(status);

  return {
    data: results.map(convertPost).filter((post) => !post.communityId),
    ...flags,
    fetchNextPage: () => loadMore(20),
    refetch: () => {},
  };
};

export const usePost = (postId: string) => {
  const result = useQuery(api.posts.getById, postId ? { postId: postId as Id<"posts"> } : "skip");

  return {
    data: result ? convertPost(result) : null,
    isLoading: result === undefined && !!postId,
    error: null,
    refetch: () => {},
  };
};

export const useComments = (postId: string) => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.comments.getByPostPaginated,
    postId ? { postId: postId as Id<"posts"> } : "skip",
    { initialNumItems: 20 }
  );

  const flags = getPaginatedStatusFlags(status);

  return {
    data: results.map(convertComment),
    ...flags,
    fetchNextPage: () => loadMore(20),
    refetch: () => {},
  };
};

export const useCreateComment = () => {
  const createComment = useMutation(api.comments.create);
  const { user } = useAuthStore();
  const { uploadFile } = useR2Upload();
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: { postId: string; content: string; audioFile?: File }) => {
    if (!user) throw new Error("User not authenticated");
    setIsPending(true);
    try {
      let audioUrl: string | undefined;
      let audioDuration: number | undefined;
      if (variables.audioFile) {
        const [uploaded, duration] = await Promise.all([
          uploadFile("audio", variables.audioFile),
          getAudioDuration(variables.audioFile),
        ]);
        audioUrl = uploaded.url;
        audioDuration = duration || undefined;
      }

      const result = await createComment({
        postId: variables.postId as Id<"posts">,
        text: variables.content || undefined,
        audioUrl,
        audioTitle: variables.audioFile?.name?.replace(/\.[^/.]+$/, "") || undefined,
        audioDuration,
      });
      return convertComment(result);
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (variables: { postId: string; content: string; audioFile?: File }, options?: FriendMutationOptions) => {
      run(variables)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useCreatePost = () => {
  const createPost = useMutation(api.posts.create);
  const { uploadFile } = useR2Upload();
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: { content: string; audioFile?: File | null; communityId?: string | null }) => {
    setIsPending(true);
    try {
      let audioUrl: string | undefined;
      let audioDuration: number | undefined;
      if (variables.audioFile) {
        const [uploaded, duration] = await Promise.all([
          uploadFile("audio", variables.audioFile),
          getAudioDuration(variables.audioFile),
        ]);
        audioUrl = uploaded.url;
        audioDuration = duration || undefined;
      }
      const result = await createPost({
        text: variables.content || undefined,
        audio_url: audioUrl,
        audio_title: variables.audioFile?.name?.replace(/\.[^/.]+$/, "") || undefined,
        audio_duration: audioDuration,
        community_id: variables.communityId ? (variables.communityId as Id<"communities">) : undefined,
      });
      return convertPost(result);
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (variables: { content: string; audioFile?: File | null; communityId?: string | null }, options?: FriendMutationOptions) => {
      run(variables)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useDeletePost = () => {
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
    mutate: (postId: string, options?: FriendMutationOptions) => {
      run(postId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useToggleLike = () => {
  const toggleLike = useMutation(api.posts.toggleLike);
  const [isPending, setIsPending] = useState(false);

  const run = async (postId: string) => {
    setIsPending(true);
    try {
      const result = await toggleLike({ postId: postId as Id<"posts"> });
      return convertPost(result);
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (postId: string, options?: FriendMutationOptions) => {
      run(postId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useToggleCommentLike = () => {
  const toggleLike = useMutation(api.comments.toggleLike);
  const [isPending, setIsPending] = useState(false);

  const run = async (commentId: string) => {
    setIsPending(true);
    try {
      const result = await toggleLike({ commentId: commentId as Id<"comments"> });
      return convertComment(result);
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (commentId: string, options?: FriendMutationOptions) => {
      run(commentId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useDeleteComment = () => {
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
    mutate: (commentId: string, options?: FriendMutationOptions) => {
      run(commentId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const usePostLikes = (postId: string | null) => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.getLikes,
    postId ? { postId: postId as Id<"posts"> } : "skip",
    { initialNumItems: 20 }
  );

  const flags = getPaginatedStatusFlags(status);

  return {
    data: results as Array<{ id: string; username: string; display_name?: string | null; avatar_url?: string | null; liked_at: string }>,
    ...flags,
    fetchNextPage: () => loadMore(20),
  };
};

export const useUserPosts = (username: string) => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.getByUsernamePaginated,
    username ? { username } : "skip",
    { initialNumItems: 20 }
  );

  const flags = getPaginatedStatusFlags(status);

  return {
    data: results.map(convertPost),
    ...flags,
    fetchNextPage: () => loadMore(20),
    refetch: () => {},
  };
};

export const useReplies = (parentId: string | null) => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.comments.getRepliesPaginated,
    parentId ? { parentId: parentId as Id<"comments"> } : "skip",
    { initialNumItems: 10 }
  );

  const flags = getPaginatedStatusFlags(status);

  return {
    data: results.map(convertComment),
    ...flags,
    fetchNextPage: () => loadMore(10),
  };
};

export const useCreateReply = () => {
  const replyMutation = useMutation(api.comments.reply);
  const { user } = useAuthStore();
  const { uploadFile } = useR2Upload();
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: { parentId: string; content: string; audioFile?: File | null }) => {
    if (!user) throw new Error("User not authenticated");
    setIsPending(true);
    try {
      let audioUrl: string | undefined;
      let audioDuration: number | undefined;
      if (variables.audioFile) {
        const [uploaded, duration] = await Promise.all([
          uploadFile("audio", variables.audioFile),
          getAudioDuration(variables.audioFile),
        ]);
        audioUrl = uploaded.url;
        audioDuration = duration || undefined;
      }
      const result = await replyMutation({
        parentId: variables.parentId as Id<"comments">,
        text: variables.content || undefined,
        audioUrl,
        audioTitle: variables.audioFile?.name?.replace(/\.[^/.]+$/, "") || undefined,
        audioDuration,
      });
      return convertComment(result);
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (variables: { parentId: string; content: string; audioFile?: File | null }, options?: FriendMutationOptions) => {
      run(variables)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};
