import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@jam-app/convex";
import type { Id } from "@jam-app/convex";
import type { User } from "@/types";
import { getNativeAvatarUri } from "@/utils/avatar";

type MutationOptions = {
  onError?: (error: Error) => void;
  onSuccess?: () => void;
};

type CompactProfile = {
  account_state?: User["account_state"];
  avatar_url?: string | null;
  banner_url?: string | null;
  bio?: string | null;
  created_at?: string;
  display_name?: string | null;
  dm_privacy?: User["dm_privacy"];
  friends_since?: string;
  genres?: string[];
  id: Id<"profiles">;
  instruments?: string[];
  requested_at?: string;
  state_changed_at?: string;
  username: string;
} | null;

export type FriendProfile = User & {
  friends_since?: string;
  requested_at?: string;
};

function normalizeUser(profile: CompactProfile): FriendProfile | null {
  if (!profile) return null;
  const now = new Date().toISOString();
  return {
    id: profile.id,
    username: profile.username,
    display_name: profile.display_name ?? "",
    avatar_url: getNativeAvatarUri(profile.avatar_url),
    banner_url: profile.banner_url ?? "",
    bio: profile.bio ?? "",
    instruments: profile.instruments ?? [],
    genres: profile.genres ?? [],
    dm_privacy: profile.dm_privacy ?? "friends",
    account_state: profile.account_state ?? "active",
    state_changed_at: profile.state_changed_at ?? now,
    created_at: profile.created_at ?? now,
    friends_since: profile.friends_since,
    requested_at: profile.requested_at,
  };
}

function getPaginatedStatusFlags(status: string) {
  return {
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
    isLoading: status === "LoadingFirstPage",
  };
}

function useProfileMutation<TArgs extends unknown[]>(
  mutationFn: (...args: TArgs) => Promise<unknown>,
) {
  const [isPending, setIsPending] = useState(false);

  const run = async (...args: TArgs) => {
    setIsPending(true);
    try {
      return await mutationFn(...args);
    } finally {
      setIsPending(false);
    }
  };

  return { isPending, run };
}

export function useFriends(searchQuery?: string, userId?: Id<"profiles"> | string) {
  const trimmedSearch = searchQuery?.trim();
  const paginated = usePaginatedQuery(
    api.friends.listPaginated,
    {
      userId: userId as Id<"profiles"> | undefined,
      search: trimmedSearch || undefined,
    },
    { initialNumItems: 50 },
  );
  const flags = getPaginatedStatusFlags(paginated.status);

  return {
    data: paginated.results.map(normalizeUser).filter((user): user is User => user !== null),
    error: null,
    ...flags,
    fetchNextPage: () => paginated.loadMore(50),
    refetch: () => {},
  };
}

export function useFriendRequests() {
  const paginated = usePaginatedQuery(
    api.friends.getRequestsPaginated,
    {},
    { initialNumItems: 20 },
  );
  const flags = getPaginatedStatusFlags(paginated.status);

  return {
    data: paginated.results.map(normalizeUser).filter((user): user is User => user !== null),
    error: null,
    ...flags,
    fetchNextPage: () => paginated.loadMore(20),
    refetch: () => {},
  };
}

export function useRequestFriend() {
  const sendRequest = useMutation(api.friends.sendRequest);
  const { isPending, run } = useProfileMutation(async (userId: string) => {
    await sendRequest({ friendId: userId as Id<"profiles"> });
  });

  return {
    isPending,
    mutate: (userId: string, options?: MutationOptions) => {
      run(userId).then(() => options?.onSuccess?.()).catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
  };
}

export function useAcceptFriend() {
  const acceptRequest = useMutation(api.friends.acceptRequest);
  const { isPending, run } = useProfileMutation(async (userId: string) => {
    await acceptRequest({ userId: userId as Id<"profiles"> });
  });

  return {
    isPending,
    mutate: (userId: string, options?: MutationOptions) => {
      run(userId).then(() => options?.onSuccess?.()).catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
  };
}

export function useDeclineFriend() {
  return useDeleteFriend();
}

export function useDeleteFriend() {
  const removeFriend = useMutation(api.friends.remove);
  const { isPending, run } = useProfileMutation(async (userId: string) => {
    await removeFriend({ userId: userId as Id<"profiles"> });
  });

  return {
    isPending,
    mutate: (userId: string, options?: MutationOptions) => {
      run(userId).then(() => options?.onSuccess?.()).catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
  };
}

export function useCancelFriendRequest() {
  return useDeleteFriend();
}

export function useSentFriendRequests() {
  const paginated = usePaginatedQuery(
    api.friends.getSentRequestsWithDataPaginated,
    {},
    { initialNumItems: 20 },
  );
  const flags = getPaginatedStatusFlags(paginated.status);
  const sentRequests = paginated.results
    .map(normalizeUser)
    .filter((user): user is User => user !== null);

  return {
    data: sentRequests,
    error: null,
    ...flags,
    fetchNextPage: () => paginated.loadMore(20),
    hasPendingRequest: (userId: Id<"profiles"> | string) =>
      sentRequests.some((request) => request.id === userId),
    refetch: () => {},
  };
}

export function useFriendsCount(userId?: Id<"profiles"> | string) {
  const result = useQuery(
    api.friends.getCount,
    userId ? { userId: userId as Id<"profiles"> } : "skip",
  );
  return result ?? 0;
}

export function useSuggestedFriends() {
  const result = useQuery(api.friends.getSuggested, { limit: 5 });

  return {
    data: result ?? [],
    isLoading: result === undefined,
  };
}
