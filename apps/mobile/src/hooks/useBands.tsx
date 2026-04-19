import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { BandApplicationItem, BandListingItem } from "@/types";

type MutationOptions = {
  onError?: (error: Error) => void;
  onSuccess?: () => void;
};

export function useBandListings(filters?: {
  region?: string;
  search?: string;
  seekingRole?: string;
}) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.bands.listPaginated,
    {
      region: filters?.region,
      search: filters?.search,
      seekingRole: filters?.seekingRole,
    },
    { initialNumItems: 20 }
  );

  return {
    data: results as BandListingItem[],
    fetchNextPage: () => loadMore(20),
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
    isLoading: status === "LoadingFirstPage",
  };
}

export function useMyBandListings() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.bands.getMyListingsPaginated,
    {},
    { initialNumItems: 20 }
  );

  return {
    data: results as BandListingItem[],
    fetchNextPage: () => loadMore(20),
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
    isLoading: status === "LoadingFirstPage",
  };
}

export function useActiveListingCount() {
  const result = useQuery(api.bands.getActiveListingCount, {});
  return result ?? 0;
}

export function useBandApplications(listingId: string) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.bands.getApplications,
    listingId ? { listingId: listingId as Id<"band_listings"> } : "skip",
    { initialNumItems: 20 }
  );

  return {
    data: results as BandApplicationItem[],
    fetchNextPage: () => loadMore(20),
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
    isLoading: status === "LoadingFirstPage",
  };
}

export function useMyBandApplications() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.bands.getMyApplicationsPaginated,
    {},
    { initialNumItems: 20 }
  );

  return {
    data: results as BandApplicationItem[],
    fetchNextPage: () => loadMore(20),
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
    isLoading: status === "LoadingFirstPage",
  };
}

export function useUserBandListings(userId: string | undefined) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.bands.getByUserPaginated,
    userId ? { userId: userId as Id<"profiles"> } : "skip",
    { initialNumItems: 10 }
  );

  return {
    data: results as BandListingItem[],
    fetchNextPage: () => loadMore(20),
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
    isLoading: status === "LoadingFirstPage",
  };
}

export function useCreateBandListing() {
  const createMutation = useMutation(api.bands.createListing);
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: {
    bandName: string;
    currentMembers: number;
    description?: string;
    genre?: string;
    maxMembers: number;
    region: string;
    seekingRole: string;
  }) => {
    setIsPending(true);
    try {
      return await createMutation(variables);
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

export function useCloseBandListing() {
  const closeMutation = useMutation(api.bands.closeListing);
  const [isPending, setIsPending] = useState(false);

  const run = async (listingId: string) => {
    setIsPending(true);
    try {
      return await closeMutation({ listingId: listingId as Id<"band_listings"> });
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutate: (listingId: string, options?: MutationOptions) => {
      run(listingId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
  };
}

export function useDeleteBandListing() {
  const deleteMutation = useMutation(api.bands.deleteListing);
  const [isPending, setIsPending] = useState(false);

  const run = async (listingId: string) => {
    setIsPending(true);
    try {
      return await deleteMutation({ listingId: listingId as Id<"band_listings"> });
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutate: (listingId: string, options?: MutationOptions) => {
      run(listingId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
  };
}

export function useApplyToBand() {
  const applyMutation = useMutation(api.bands.apply);
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: {
    experience: string;
    instrument: string;
    listingId: string;
    message?: string;
  }) => {
    setIsPending(true);
    try {
      return await applyMutation({
        experience: variables.experience,
        instrument: variables.instrument,
        listingId: variables.listingId as Id<"band_listings">,
        message: variables.message,
      });
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

export function useAcceptBandApplication() {
  const acceptMutation = useMutation(api.bands.acceptApplication);
  const [isPending, setIsPending] = useState(false);

  const run = async (applicationId: string) => {
    setIsPending(true);
    try {
      return await acceptMutation({
        applicationId: applicationId as Id<"band_applications">,
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutate: (applicationId: string, options?: MutationOptions) => {
      run(applicationId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
  };
}

export function useRejectBandApplication() {
  const rejectMutation = useMutation(api.bands.rejectApplication);
  const [isPending, setIsPending] = useState(false);

  const run = async (applicationId: string) => {
    setIsPending(true);
    try {
      return await rejectMutation({
        applicationId: applicationId as Id<"band_applications">,
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutate: (applicationId: string, options?: MutationOptions) => {
      run(applicationId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
  };
}
