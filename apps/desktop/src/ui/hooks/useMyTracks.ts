import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@jam-app/convex";
import type { Id } from "@jam-app/convex";
import type { FunctionReturnType } from "convex/server";

// Track type inferred from Convex backend
type TrackListReturn = FunctionReturnType<typeof api.myTracks.getMyTracks>;
export type MyTrack = TrackListReturn["page"][number];

type MutationOptions = {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

// ============================================
// Queries
// ============================================

export const useMyTracks = () => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.myTracks.getMyTracks,
    {},
    { initialNumItems: 30 }
  );

  return {
    data: results as MyTrack[],
    isLoading: status === "LoadingFirstPage",
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
    fetchNextPage: () => loadMore(20),
  };
};

export const useMyTrackCount = () => {
  const result = useQuery(api.myTracks.getMyTrackCount, {});
  return result ?? 0;
};

// ============================================
// Mutations
// ============================================

export const useAddTrack = () => {
  const addMutation = useMutation(api.myTracks.addTrack);
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: {
    title: string;
    audioUrl: string;
    duration: number;
    fileSize: number;
    contentType: string;
  }) => {
    setIsPending(true);
    try {
      return await addMutation(variables);
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (variables: Parameters<typeof run>[0], options?: MutationOptions) => {
      run(variables)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useDeleteTrack = () => {
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
    mutate: (trackId: string, options?: MutationOptions) => {
      run(trackId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};
