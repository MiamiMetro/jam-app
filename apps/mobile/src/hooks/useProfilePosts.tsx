import { usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useProfilePosts(username: string | undefined) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.getByUsernamePaginated,
    username ? { username } : "skip",
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
