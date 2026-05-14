import { useCommunities } from "@/hooks/useCommunities";
import { useAllUsers } from "@/hooks/useUsers";
import type { CommunityListItem, User } from "@/types";

export type UnifiedSearchResult = {
  communities: CommunityListItem[];
  hasResults: boolean;
  isLoading: boolean;
  users: User[];
};

export function useUnifiedSearch(query: string): UnifiedSearchResult {
  const trimmed = query.trim();
  const enabled = trimmed.length > 0;

  const { data: users = [], isLoading: isLoadingUsers } = useAllUsers(
    trimmed || undefined,
    enabled,
  );
  const { data: communities = [], isLoading: isLoadingCommunities } =
    useCommunities(enabled ? { search: trimmed } : undefined);

  const visibleUsers = enabled ? users.slice(0, 5) : [];
  const visibleCommunities = enabled ? communities.slice(0, 5) : [];

  return {
    communities: visibleCommunities,
    hasResults: visibleUsers.length > 0 || visibleCommunities.length > 0,
    isLoading: enabled && (isLoadingUsers || isLoadingCommunities),
    users: visibleUsers,
  };
}
