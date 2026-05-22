import { useConvex, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@jam-app/convex";
import type { Id } from "@jam-app/convex";
import type { User } from "@/types";

export type PresenceStatus = "online" | "away" | "busy";
export type OnlinePresenceUser = User & {
  status: PresenceStatus;
  statusMessage: string;
};

export type UIMessage = {
  _creationTime?: number;
  audio_url?: string | null;
  content?: string;
  id: string;
  isDeleted?: boolean;
  senderId?: string;
  timestamp?: string;
};

export type UIConversation = {
  hasUnread: boolean;
  id: string;
  isGroup: boolean;
  lastMessage?: {
    audio_url?: string | null;
    content?: string;
    id: string;
    senderId?: string;
    timestamp?: string;
  };
  name?: string;
  otherUser?: {
    avatar_url: string;
    display_name: string;
    id: Id<"profiles">;
    username: string;
  };
  participantCount?: number;
  userId: string;
};

type MutationOptions<T = void> = {
  onError?: (error: Error) => void;
  onSuccess?: (value: T) => void;
};

type CompactProfile = {
  account_state?: User["account_state"];
  avatar_url?: string | null;
  banner_url?: string | null;
  bio?: string | null;
  created_at?: string;
  display_name?: string | null;
  dm_privacy?: User["dm_privacy"];
  genres?: string[];
  id: Id<"profiles">;
  instruments?: string[];
  state?: string;
  state_changed_at?: string;
  status?: string;
  statusMessage?: string;
  username: string;
};

function normalizeUser(profile: CompactProfile): User {
  const now = new Date().toISOString();
  return {
    id: profile.id,
    username: profile.username,
    display_name: profile.display_name ?? "",
    avatar_url: profile.avatar_url ?? "",
    banner_url: profile.banner_url ?? "",
    bio: profile.bio ?? "",
    instruments: profile.instruments ?? [],
    genres: profile.genres ?? [],
    dm_privacy: profile.dm_privacy ?? "friends",
    account_state: profile.account_state ?? "active",
    state_changed_at: profile.state_changed_at ?? now,
    created_at: profile.created_at ?? now,
  };
}

function normalizePresenceStatus(status: string | undefined): PresenceStatus {
  return status === "away" || status === "busy" ? status : "online";
}

function getPaginatedStatusFlags(status: string) {
  return {
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
    isLoading: status === "LoadingFirstPage",
  };
}

function convertMessage(message: {
  _creationTime?: number;
  audio_url?: string | null;
  created_at: string;
  deleted_at?: number | null;
  id: string;
  sender_id: string;
  text?: string;
}): UIMessage {
  return {
    id: message.id,
    senderId: message.sender_id,
    content: message.text || "",
    audio_url: message.audio_url || null,
    timestamp: message.created_at,
    _creationTime: message._creationTime,
    isDeleted: message.deleted_at != null,
  };
}

function convertConversation(conv: {
  hasUnread: boolean;
  id: string;
  isGroup: boolean;
  last_message?: { audio_url?: string; created_at: string; id: string; sender_id: string; text?: string } | null;
  name?: string;
  other_user?: { avatar_url: string; display_name: string; id: string; username: string } | null;
  participant_count?: number;
}): UIConversation {
  return {
    id: conv.id,
    userId: conv.other_user?.id || "",
    isGroup: conv.isGroup,
    name: conv.name,
    participantCount: conv.participant_count,
    otherUser: conv.other_user
      ? {
          id: conv.other_user.id as Id<"profiles">,
          username: conv.other_user.username,
          display_name: conv.other_user.display_name ?? "",
          avatar_url: conv.other_user.avatar_url ?? "",
        }
      : undefined,
    hasUnread: conv.hasUnread,
    lastMessage: conv.last_message
      ? {
          id: conv.last_message.id,
          senderId: conv.last_message.sender_id,
          content: conv.last_message.text || "",
          audio_url: conv.last_message.audio_url || null,
          timestamp: conv.last_message.created_at,
        }
      : undefined,
  };
}

function mergeAndDeduplicateMessages(...messageArrays: UIMessage[][]): UIMessage[] {
  const seen = new Set<string>();
  return messageArrays
    .flat()
    .filter((message) => {
      if (seen.has(message.id)) return false;
      seen.add(message.id);
      return true;
    })
    .sort((a, b) => (a._creationTime ?? 0) - (b._creationTime ?? 0));
}

export function useOnlineUsers() {
  const result = useQuery(api.users.getOnline, {});
  const onlineUsers: OnlinePresenceUser[] = (result ?? []).map((profile) => ({
    ...normalizeUser(profile),
    status: normalizePresenceStatus(profile.status),
    statusMessage: profile.statusMessage ?? "",
  }));

  return {
    data: onlineUsers,
    error: null,
    fetchNextPage: () => {},
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: result === undefined,
  };
}

export function useOnlineIdsSnapshot(userIds: Id<"profiles">[], enabled = true) {
  const stableUserIds = useMemo(
    () => Array.from(new Map(userIds.map((id) => [String(id), id])).values()),
    [userIds],
  );
  const canQuery = enabled && stableUserIds.length > 0;
  const result = useQuery(
    api.users.getOnlineIds,
    canQuery ? { userIds: stableUserIds } : "skip",
  );

  return {
    data: result ?? [],
    error: null,
    isLoading: canQuery && result === undefined,
  };
}

export function useUser(username: string | undefined) {
  const result = useQuery(
    api.profiles.getByUsername,
    username ? { username } : "skip",
  );
  return {
    data: result ? normalizeUser(result) : null,
    error: null,
    isLoading: result === undefined && !!username,
  };
}

export function useProfileCatalog() {
  const result = useQuery(api.profiles.getProfileCatalog, {});
  return {
    data: result ?? { genres: [], instruments: [] },
    error: null,
    isLoading: result === undefined,
  };
}

export function useMe() {
  const result = useQuery(api.profiles.getMe, {});
  return {
    data: result ? normalizeUser(result) : null,
    error: null,
    isLoading: result === undefined,
  };
}

export function useUpdateProfile() {
  const updateProfile = useMutation(api.profiles.updateMe);
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: Parameters<typeof updateProfile>[0]) => {
    setIsPending(true);
    try {
      return (await updateProfile(variables)) as User;
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutate: (variables: Parameters<typeof run>[0], options?: MutationOptions<User>) => {
      run(variables).then((value) => options?.onSuccess?.(value)).catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
  };
}

export function useSoftDeleteProfile() {
  const softDelete = useMutation(api.profiles.softDeleteMe);
  const [isPending, setIsPending] = useState(false);

  const run = async () => {
    setIsPending(true);
    try {
      return (await softDelete({})) as User;
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutate: (options?: MutationOptions<User>) => {
      run().then((value) => options?.onSuccess?.(value)).catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
  };
}

export function useAllUsers(search?: string, enabled = true) {
  const paginated = usePaginatedQuery(
    api.users.searchPaginated,
    enabled ? { search: search || undefined } : "skip",
    { initialNumItems: 20 },
  );
  const flags = getPaginatedStatusFlags(paginated.status);

  return {
    data: paginated.results.map(normalizeUser),
    error: null,
    ...flags,
    fetchNextPage: () => paginated.loadMore(20),
    refetch: () => {},
  };
}

export function useConversationParticipants(conversationId: string | undefined) {
  const result = useQuery(
    api.messages.getParticipants,
    conversationId ? { conversationId: conversationId as Id<"conversations"> } : "skip",
  );
  return {
    data: result ? result.map(normalizeUser) : [],
    error: null,
    isLoading: result === undefined && !!conversationId,
  };
}

export function useConversations(_userId?: string) {
  const paginated = usePaginatedQuery(
    api.messages.getConversationsPaginated,
    {},
    { initialNumItems: 50 },
  );
  const flags = getPaginatedStatusFlags(paginated.status);

  return {
    data: paginated.results.map(convertConversation),
    error: null,
    ...flags,
    fetchNextPage: () => paginated.loadMore(50),
    refetch: () => {},
  };
}

export function useEnsureDmConversation() {
  const ensureDm = useMutation(api.messages.ensureDmWithUser);
  const [isPending, setIsPending] = useState(false);

  const run = async (partnerId: string) => {
    setIsPending(true);
    try {
      const result = await ensureDm({ userId: partnerId as Id<"profiles"> });
      return result.conversationId as string;
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutate: (partnerId: string, options?: MutationOptions<string>) => {
      run(partnerId).then((value) => options?.onSuccess?.(value)).catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
  };
}

export function useMessages(_userId: string | undefined, conversationId: string | undefined) {
  const [olderMessages, setOlderMessages] = useState<UIMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const previousConversationIdRef = useRef<string | null>(null);
  const conversationOpenedAtRef = useRef(Date.now());
  const convex = useConvex();

  useEffect(() => {
    if (previousConversationIdRef.current === conversationId) return;
    previousConversationIdRef.current = conversationId ?? null;
    setOlderMessages([]);
    setNextCursor(null);
    setHasMore(false);
    setIsLoadingMore(false);
    conversationOpenedAtRef.current = Date.now();
  }, [conversationId]);

  const firstPageResult = useQuery(
    api.messages.getByConversationPaginated,
    conversationId
      ? { conversationId: conversationId as Id<"conversations">, limit: 50 }
      : "skip",
  );

  useEffect(() => {
    if (firstPageResult && olderMessages.length === 0) {
      setNextCursor(firstPageResult.nextCursor ?? null);
      setHasMore(firstPageResult.hasMore ?? false);
    }
  }, [firstPageResult, olderMessages.length]);

  const fetchNextPage = async () => {
    if (!nextCursor || isLoadingMore || !conversationId) return;
    setIsLoadingMore(true);
    try {
      const olderResult = await convex.query(api.messages.getByConversationPaginated, {
        conversationId: conversationId as Id<"conversations">,
        cursor: nextCursor,
        limit: 50,
      });
      const newOlderMessages = olderResult.data.map(convertMessage);
      const currentFirstPage = firstPageResult?.data?.map(convertMessage) ?? [];
      setOlderMessages((previous) =>
        mergeAndDeduplicateMessages(newOlderMessages, previous, currentFirstPage),
      );
      setNextCursor(olderResult.nextCursor ?? null);
      setHasMore(olderResult.hasMore ?? false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const allMessages = useMemo(() => {
    const firstPageMessages = firstPageResult?.data?.map(convertMessage) ?? [];
    return mergeAndDeduplicateMessages(olderMessages, firstPageMessages);
  }, [firstPageResult?.data, olderMessages]);

  return {
    conversationOpenedAt: conversationOpenedAtRef.current,
    data: allMessages,
    error: null,
    fetchNextPage,
    hasNextPage: hasMore,
    isFetchingNextPage: isLoadingMore,
    isLoading: firstPageResult === undefined && !!conversationId,
    lastReadMessageAt: firstPageResult?.lastReadMessageAt ?? null,
    otherParticipantLastRead: firstPageResult?.otherParticipantLastRead ?? null,
    refetch: () => {
      setOlderMessages([]);
      setNextCursor(null);
      setHasMore(false);
    },
  };
}

export function useSendMessage() {
  const sendMessage = useMutation(api.messages.send);
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: { content: string; conversationId: string }) => {
    setIsPending(true);
    try {
      return convertMessage(
        await sendMessage({
          conversationId: variables.conversationId as Id<"conversations">,
          text: variables.content || undefined,
        }),
      );
    } finally {
      setIsPending(false);
    }
  };

  return {
    isPending,
    mutate: (variables: Parameters<typeof run>[0], options?: MutationOptions<UIMessage>) => {
      run(variables).then((value) => options?.onSuccess?.(value)).catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
  };
}

export function useMarkAsRead() {
  const markAsRead = useMutation(api.messages.markAsRead);
  return {
    mutate: (conversationId: string) => {
      markAsRead({ conversationId: conversationId as Id<"conversations"> }).catch((error) => {
        console.warn("Failed to mark conversation as read", error);
      });
    },
    mutateAsync: async (conversationId: string) =>
      markAsRead({ conversationId: conversationId as Id<"conversations"> }),
  };
}

export function useDeleteMessage() {
  const deleteMessage = useMutation(api.messages.remove);
  return {
    mutate: (messageId: string) => {
      deleteMessage({ messageId: messageId as Id<"messages"> }).catch((error) => {
        console.warn("Failed to delete message", error);
      });
    },
    mutateAsync: async (messageId: string) =>
      deleteMessage({ messageId: messageId as Id<"messages"> }),
  };
}

export function useBlockUser() {
  const blockUser = useMutation(api.blocks.block);
  return {
    mutateAsync: async (userId: string) =>
      blockUser({ userId: userId as Id<"profiles"> }),
  };
}

export function useUnblockUser() {
  const unblockUser = useMutation(api.blocks.unblock);
  return {
    mutateAsync: async (userId: string) =>
      unblockUser({ userId: userId as Id<"profiles"> }),
  };
}

export function useIsBlockedByMe(userId?: string | null) {
  const result = useQuery(
    api.blocks.isBlockedByMe,
    userId ? { userId: userId as Id<"profiles"> } : "skip",
  );
  return {
    data: result ?? false,
    isLoading: result === undefined && !!userId,
  };
}
