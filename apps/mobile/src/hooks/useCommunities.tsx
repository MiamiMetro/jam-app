import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { CommunityListItem } from "@/types";

type MutationOptions = {
  onError?: (error: Error) => void;
  onSuccess?: () => void;
};

type CommunityFilters = {
  search?: string;
  tag?: string;
};

export function useCommunities(filters?: CommunityFilters) {
  const trimmedSearch = filters?.search?.trim();
  const { results, status, loadMore } = usePaginatedQuery(
    api.communities.listPaginated,
    {
      ...(trimmedSearch ? { search: trimmedSearch } : {}),
      ...(filters?.tag ? { tag: filters.tag } : {}),
    },
    { initialNumItems: 20 }
  );

  return {
    data: results as CommunityListItem[],
    communities: results,
    fetchNextPage: () => loadMore(20),
    hasNextPage: status === "CanLoadMore",
    isLoading: status === "LoadingFirstPage",
    isFetchingNextPage: status === "LoadingMore",
    isLoadingMore: status === "LoadingMore",
    canLoadMore: status === "CanLoadMore",
    loadMore,
  };
}

export function useCommunity(handle: string) {
  const result = useQuery(
    api.communities.getByHandle,
    handle ? { handle } : "skip"
  );

  return {
    data: result ?? null,
    isLoading: result === undefined && !!handle,
  };
}

export function useCommunityById(communityId: string) {
  const result = useQuery(
    api.communities.getById,
    communityId ? { communityId: communityId as Id<"communities"> } : "skip"
  );

  return {
    data: result ?? null,
    isLoading: result === undefined && !!communityId,
  };
}

export function useJoinedCommunities() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.communities.getJoined,
    {},
    { initialNumItems: 50 }
  );

  return {
    data: results,
    fetchNextPage: () => loadMore(50),
    hasNextPage: status === "CanLoadMore",
    isLoading: status === "LoadingFirstPage",
  };
}

export function useMemberRole(communityId: string) {
  const result = useQuery(
    api.communities.getMemberRole,
    communityId ? { communityId: communityId as Id<"communities"> } : "skip"
  );

  return result ?? null;
}

export function useCommunityMembers(communityId: string) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.communities.getMembersPaginated,
    communityId ? { communityId: communityId as Id<"communities"> } : "skip",
    { initialNumItems: 30 }
  );

  return {
    data: results,
    fetchNextPage: () => loadMore(30),
    hasNextPage: status === "CanLoadMore",
    isLoading: status === "LoadingFirstPage",
  };
}

export function useSearchCommunityMembers(communityId: string, username: string) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.communities.searchMembersPaginated,
    communityId && username.length >= 2
      ? { communityId: communityId as Id<"communities">, username }
      : "skip",
    { initialNumItems: 20 }
  );

  return {
    data: results,
    fetchNextPage: () => loadMore(20),
    hasNextPage: status === "CanLoadMore",
    isLoading: status === "LoadingFirstPage",
  };
}

export function useCommunityCreatedCount() {
  const count = useQuery(api.communities.getCreatedCount, {});
  return count ?? 0;
}

export function useCreatedCommunityCount() {
  const count = useQuery(api.communities.getCreatedCount, {});
  return {
    count: count ?? 0,
    isLoading: count === undefined,
  };
}

export function useCreateCommunity() {
  const createMutation = useMutation(api.communities.create);
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: {
    avatarUrl?: string;
    avatar_url?: string;
    bannerUrl?: string;
    banner_url?: string;
    description?: string;
    handle: string;
    name: string;
    tags: string[];
    themeColor: string;
  }) => {
    setIsPending(true);
    try {
      return await createMutation({
        avatar_url: variables.avatar_url ?? variables.avatarUrl,
        banner_url: variables.banner_url ?? variables.bannerUrl,
        description: variables.description,
        handle: variables.handle,
        name: variables.name,
        tags: variables.tags,
        themeColor: variables.themeColor,
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

export function useUpdateCommunity() {
  const updateMutation = useMutation(api.communities.update);
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: {
    avatarUrl?: string;
    avatar_url?: string;
    bannerUrl?: string;
    banner_url?: string;
    communityId: string;
    description?: string;
    name?: string;
    tags?: string[];
    themeColor?: string;
  }) => {
    setIsPending(true);
    try {
      return await updateMutation({
        avatar_url: variables.avatar_url ?? variables.avatarUrl,
        banner_url: variables.banner_url ?? variables.bannerUrl,
        communityId: variables.communityId as Id<"communities">,
        description: variables.description,
        name: variables.name,
        tags: variables.tags,
        themeColor: variables.themeColor,
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

export function useJoinCommunity() {
  const joinMutation = useMutation(api.communities.join);
  const [isPending, setIsPending] = useState(false);

  const run = async (communityId: string) => {
    setIsPending(true);
    try {
      return await joinMutation({ communityId: communityId as Id<"communities"> });
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutate: (communityId: string, options?: MutationOptions) => {
      run(communityId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
  };
}

export function useLeaveCommunity() {
  const leaveMutation = useMutation(api.communities.leave);
  const [isPending, setIsPending] = useState(false);

  const run = async (communityId: string) => {
    setIsPending(true);
    try {
      return await leaveMutation({ communityId: communityId as Id<"communities"> });
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutate: (communityId: string, options?: MutationOptions) => {
      run(communityId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
  };
}

export function usePromoteMod() {
  const promoteMutation = useMutation(api.communities.promoteMod);
  const [isPending, setIsPending] = useState(false);

  const run = async (communityId: string, profileId: string) => {
    setIsPending(true);
    try {
      return await promoteMutation({
        communityId: communityId as Id<"communities">,
        profileId: profileId as Id<"profiles">,
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutate: (
      args: { communityId: string; profileId: string },
      options?: MutationOptions
    ) => {
      run(args.communityId, args.profileId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: (args: { communityId: string; profileId: string }) =>
      run(args.communityId, args.profileId),
  };
}

export function useDemoteMod() {
  const demoteMutation = useMutation(api.communities.demoteMod);
  const [isPending, setIsPending] = useState(false);

  const run = async (communityId: string, profileId: string) => {
    setIsPending(true);
    try {
      return await demoteMutation({
        communityId: communityId as Id<"communities">,
        profileId: profileId as Id<"profiles">,
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutate: (
      args: { communityId: string; profileId: string },
      options?: MutationOptions
    ) => {
      run(args.communityId, args.profileId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: (args: { communityId: string; profileId: string }) =>
      run(args.communityId, args.profileId),
  };
}

export function useRemoveMember() {
  const removeMutation = useMutation(api.communities.removeMember);
  const [isPending, setIsPending] = useState(false);

  const run = async (communityId: string, profileId: string) => {
    setIsPending(true);
    try {
      return await removeMutation({
        communityId: communityId as Id<"communities">,
        profileId: profileId as Id<"profiles">,
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutate: (
      args: { communityId: string; profileId: string },
      options?: MutationOptions
    ) => {
      run(args.communityId, args.profileId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: (args: { communityId: string; profileId: string }) =>
      run(args.communityId, args.profileId),
  };
}

export type CommunityId = Id<"communities">;
