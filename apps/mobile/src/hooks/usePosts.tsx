import { usePaginatedQuery } from "convex/react";
import { api } from "@jam-app/convex";
import type { Id } from "@jam-app/convex";

export function usePosts() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.getFeedPaginated,
    {},
    { initialNumItems: 10 }
  );

  return {
    posts: results,
    isLoading: status === "LoadingFirstPage",
    isLoadingMore: status === "LoadingMore",
    canLoadMore: status === "CanLoadMore",
    loadMore,
  };
}

export function useCommunityPosts(communityId: string | undefined) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.getCommunityPostsPaginated,
    communityId ? { communityId: communityId as Id<"communities"> } : "skip",
    { initialNumItems: 10 }
  );

  return {
    posts: results,
    isLoading: status === "LoadingFirstPage",
    isLoadingMore: status === "LoadingMore",
    canLoadMore: status === "CanLoadMore",
    loadMore,
  };
}
