import { usePaginatedQuery } from "convex/react";
import { api } from "@jam-app/convex";

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
