// useUnifiedSearch.ts — Combined user + community search hook
import { useAllUsers } from "@/hooks/useUsers";
import { useCommunities } from "@/hooks/useCommunities";
import type { User } from "@/lib/api/types";
import type { Community } from "@/hooks/useCommunities";

export interface UnifiedSearchResult {
  users: User[];
  communities: Community[];
  isLoading: boolean;
  hasResults: boolean;
}

/**
 * Combines user and community search into a single hook.
 * Both queries fire in parallel using existing hooks.
 * Only activates when query is non-empty (>= 1 char).
 */
export function useUnifiedSearch(query: string): UnifiedSearchResult {
  const trimmed = query.trim();
  const enabled = trimmed.length > 0;

  const {
    data: users = [],
    isLoading: isLoadingUsers,
  } = useAllUsers(trimmed || undefined, enabled);

  const {
    data: communities = [],
    isLoading: isLoadingCommunities,
  } = useCommunities(enabled ? { search: trimmed } : undefined);

  const isLoading = enabled && (isLoadingUsers || isLoadingCommunities);
  const hasResults = users.length > 0 || communities.length > 0;

  return {
    users: enabled ? users.slice(0, 5) : [],
    communities: enabled ? communities.slice(0, 5) : [],
    isLoading,
    hasResults,
  };
}
