import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@jam-app/convex";
import type { Id } from "@jam-app/convex";

export function useRooms(search?: string) {
  const trimmedSearch = search?.trim();
  const { results, status, loadMore } = usePaginatedQuery(
    api.rooms.listActivePaginated,
    trimmedSearch ? { search: trimmedSearch } : {},
    { initialNumItems: 10 },
  );

  return {
    rooms: results,
    isLoading: status === "LoadingFirstPage",
    isLoadingMore: status === "LoadingMore",
    canLoadMore: status === "CanLoadMore",
    loadMore,
  };
}

export function useActiveRooms(genre?: string, search?: string) {
  const trimmedSearch = search?.trim();
  const { results, status, loadMore } = usePaginatedQuery(
    api.rooms.listActivePaginated,
    {
      ...(genre ? { genre } : {}),
      ...(trimmedSearch ? { search: trimmedSearch } : {}),
    },
    { initialNumItems: 20 },
  );

  return {
    data: results,
    isLoading: status === "LoadingFirstPage",
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
    fetchNextPage: () => loadMore(20),
  };
}

export function useActiveCommunityRooms(genre?: string, search?: string) {
  const trimmedSearch = search?.trim();
  const { results, status, loadMore } = usePaginatedQuery(
    api.rooms.listActiveCommunityPaginated,
    {
      ...(genre ? { genre } : {}),
      ...(trimmedSearch ? { search: trimmedSearch } : {}),
    },
    { initialNumItems: 20 },
  );

  return {
    data: results,
    isLoading: status === "LoadingFirstPage",
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
    fetchNextPage: () => loadMore(20),
  };
}

export function useRoom(handle: string | undefined) {
  const room = useQuery(api.rooms.getByHandle, handle ? { handle } : "skip");

  return {
    data: room ?? null,
    room: room ?? null,
    isLoading: room === undefined && !!handle,
  };
}

export function useMyRoom() {
  const room = useQuery(api.rooms.getMyRoom, {});

  return {
    data: room ?? null,
    room: room ?? null,
    isLoading: room === undefined,
  };
}

export function useMyCommunityRoom(communityId: string | undefined) {
  const room = useQuery(
    api.rooms.getMyCommunityRoom,
    communityId ? { communityId: communityId as Id<"communities"> } : "skip",
  );

  return {
    data: room ?? null,
    room: room ?? null,
    isLoading: room === undefined && !!communityId,
  };
}

export function useCommunityRooms(
  communityId: string | undefined,
  search?: string,
) {
  const trimmedSearch = search?.trim();
  const { results, status, loadMore } = usePaginatedQuery(
    api.rooms.listCommunityRoomsPaginated,
    communityId
      ? {
          communityId: communityId as Id<"communities">,
          ...(trimmedSearch ? { search: trimmedSearch } : {}),
        }
      : "skip",
    { initialNumItems: 10 },
  );

  return {
    rooms: results,
    isLoading: status === "LoadingFirstPage",
    isLoadingMore: status === "LoadingMore",
    canLoadMore: status === "CanLoadMore",
    loadMore,
  };
}

export function useFriendsInRooms() {
  const friendsInRooms = useQuery(api.rooms.getFriendsInRooms, {});

  return {
    data: friendsInRooms ?? [],
    friendsInRooms: friendsInRooms ?? [],
    isLoading: friendsInRooms === undefined,
  };
}

export function useRoomParticipants(roomId: string | undefined) {
  const data = useQuery(
    api.rooms.getParticipants,
    roomId ? { roomId: roomId as Id<"rooms"> } : "skip",
  );

  return {
    data: data?.participants ?? [],
    participants: data?.participants ?? [],
    totalCount: data?.total_count ?? 0,
    isLoading: data === undefined && !!roomId,
  };
}

export function useRoomMessages(roomId: string | undefined) {
  const data = useQuery(
    api.roomMessages.getLatest,
    roomId ? { roomId: roomId as Id<"rooms"> } : "skip",
  );

  return {
    data: data ?? [],
    isLoading: data === undefined && !!roomId,
  };
}

export function useSendRoomMessage() {
  return useMutation(api.roomMessages.send);
}

export function useRoomHeartbeat() {
  return useMutation(api.presence.roomHeartbeat);
}

export function useDisconnectPresence() {
  return useMutation(api.presence.disconnect);
}

export function useGuestRoomHeartbeat() {
  return useMutation(api.presence.guestRoomHeartbeat);
}

export function useCreateRoom() {
  return useMutation(api.rooms.create);
}

export function useUpdateRoom() {
  return useMutation(api.rooms.update);
}

export function useActivateRoom() {
  return useMutation(api.rooms.activate);
}

export function useDeactivateRoom() {
  return useMutation(api.rooms.deactivate);
}

export function useDeleteRoom() {
  return useMutation(api.rooms.deleteRoom);
}

export function useSetStreamUrl() {
  return useMutation(api.rooms.setStreamUrl);
}

export function useUpdateRoomStatus() {
  return useMutation(api.rooms.updateRoomStatus);
}

export function useCreatePerformerJoinToken() {
  return useMutation(api.rooms.createPerformerJoinToken);
}

export function useRefreshJamSession() {
  return useMutation(api.rooms.refreshJamSession);
}

export function useStartListenerMode() {
  return useMutation(api.rooms.startListenerMode);
}

export function useStopListenerMode() {
  return useMutation(api.rooms.stopListenerMode);
}

export function useRefreshListenerMode() {
  return useMutation(api.rooms.refreshListenerMode);
}
