import { usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useRooms() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.rooms.listActivePaginated,
    {},
    { initialNumItems: 10 }
  );

  return {
    rooms: results,
    isLoading: status === "LoadingFirstPage",
    isLoadingMore: status === "LoadingMore",
    canLoadMore: status === "CanLoadMore",
    loadMore,
  };
}
