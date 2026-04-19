import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { MyTrackItem } from "@/types";
import type { Id } from "../../convex/_generated/dataModel";

type MutationOptions = {
  onError?: (error: Error) => void;
  onSuccess?: () => void;
};

export function useMyTracks() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.myTracks.getMyTracks,
    {},
    { initialNumItems: 30 }
  );

  return {
    data: results as MyTrackItem[],
    tracks: results,
    fetchNextPage: () => loadMore(20),
    hasNextPage: status === "CanLoadMore",
    isLoading: status === "LoadingFirstPage",
    isFetchingNextPage: status === "LoadingMore",
    isLoadingMore: status === "LoadingMore",
    canLoadMore: status === "CanLoadMore",
    loadMore,
  };
}

export function useMyTrackCount() {
  const result = useQuery(api.myTracks.getMyTrackCount, {});
  return result ?? 0;
}

export function useAddTrack() {
  const addMutation = useMutation(api.myTracks.addTrack);
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: {
    audioUrl: string;
    contentType: string;
    duration: number;
    fileSize: number;
    title: string;
  }) => {
    setIsPending(true);
    try {
      return await addMutation(variables);
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutate: (variables: Parameters<typeof run>[0], options?: MutationOptions) => {
      run(variables)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
  };
}

export function useDeleteTrack() {
  const deleteMutation = useMutation(api.myTracks.deleteTrack);
  const [isPending, setIsPending] = useState(false);

  const run = async (trackId: string) => {
    setIsPending(true);
    try {
      return await deleteMutation({
        trackId: trackId as Id<"my_tracks">,
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutate: (trackId: string, options?: MutationOptions) => {
      run(trackId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
  };
}
