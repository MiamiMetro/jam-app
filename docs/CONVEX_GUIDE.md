# Convex Guide

Last updated: 2026-04-13

This is the Convex architecture guide for the repo. It defines the approved data model, frontend hook usage, and the rules contributors are expected to follow.

## Goals

1. Keep Convex as the source of truth for app state.
2. Use native Convex hooks directly.
3. Use native Convex pagination by default.
4. Keep hot paths index-backed.
5. Prevent pagination drift, duplicate rows, and cursor bugs.
6. Treat realtime as a deliberate costed choice.

## Non-negotiable Rules

1. Convex-backed UI uses `useQuery`, `usePaginatedQuery`, and `useMutation` first.
2. Native pagination is the default:
   - backend: `paginationOpts: paginationOptsValidator` plus `.paginate(...)`
   - frontend: `usePaginatedQuery(...)`
3. Ordering and cursor dimension must match.
4. User-visible list filters must be pushed into indexed query/search paths, not applied after `.paginate()`.
5. Mutations must include auth, validation/sanitization, and rate limiting where applicable.
6. No render-phase `setState`.
7. Virtualization is a render optimization only, not a data-fetching strategy.

## Approved Backend Surface

### Paginated queries

Use native paginated queries for list UIs. Current important paginated endpoints include:

1. `posts.getFeedPaginated`
2. `posts.getCommunityPostsPaginated`
3. `posts.getByUsernamePaginated`
4. `posts.getLikes`
5. `comments.getByPostPaginated`
6. `comments.getRepliesPaginated`
7. `friends.listPaginated`
8. `friends.getRequestsPaginated`
9. `friends.getSentRequestsWithDataPaginated`
10. `users.searchPaginated`
11. `messages.getConversationsPaginated`
12. `rooms.listActivePaginated`
13. `communities.listPaginated`
14. `communities.getJoined`
15. `communities.getMembersPaginated`
16. `communities.searchMembersPaginated`
17. `bands.listPaginated`
18. `bands.getMyListingsPaginated`
19. `bands.getByUserPaginated`
20. `bands.getApplications`
21. `bands.getMyApplicationsPaginated`
22. `myTracks.getMyTracks`
23. `blocks.listPaginated`

### Allowed targeted exception

`messages.getByConversationPaginated` is the only approved hybrid path:

- newest page stays reactive
- older pages load one-shot with `useConvex().query(...)`

This exception exists for reverse DM history loading only.

## Current Hook-to-Endpoint Map

### Users and profiles

- `useCurrentUser` / profile hooks -> profile `useQuery` endpoints
- `useOnlineUsers` -> `users.getOnline`
- `useAllUsers` -> `users.searchPaginated`

### Friends

- `useFriends` -> `friends.listPaginated`
- `useFriendRequests` -> `friends.getRequestsPaginated`
- `useSentFriendRequests` -> `friends.getSentRequestsWithDataPaginated`
- `useFriendsCount` -> `friends.getCount`
- `useSuggestedFriends` -> `friends.getSuggested`

### Posts and comments

- `usePosts` / `useGlobalPosts` -> `posts.getFeedPaginated`
- `useCommunityPosts` -> `posts.getCommunityPostsPaginated`
- `useUserPosts` -> `posts.getByUsernamePaginated`
- `usePost` -> `posts.getById`
- `useComments` -> `comments.getByPostPaginated`
- `useReplies` -> `comments.getRepliesPaginated`
- `usePostLikes` -> `posts.getLikes`

### Messages

- `useConversations` -> `messages.getConversationsPaginated`
- `useMessages` -> hybrid `messages.getByConversationPaginated`
- `useConversationParticipants` -> `messages.getParticipants`
- `useEnsureDmConversation` -> `messages.ensureDmWithUser`

### Rooms

- `useRoom` -> `rooms.getByHandle`
- `useMyRoom` -> `rooms.getMyRoom`
- `useActiveRooms` -> `rooms.listActivePaginated`
- `useRoomParticipants` -> `rooms.getParticipants`
- `useFriendsInRooms` -> `rooms.getFriendsInRooms`
- `useRoomMessages` -> `roomMessages.getLatest`

### Communities

- `useCommunities` -> `communities.listPaginated`
- `useJoinedCommunities` -> `communities.getJoined`
- `useCommunityMembers` -> `communities.getMembersPaginated`
- `useSearchCommunityMembers` -> `communities.searchMembersPaginated`
- `useCommunity` -> `communities.getByHandle`
- `useCommunityById` -> `communities.getById`
- `useMemberRole` -> `communities.getMemberRole`

### Bands

- `useBandListings` -> `bands.listPaginated`
- `useMyBandListings` -> `bands.getMyListingsPaginated`
- `useUserBandListings` -> `bands.getByUserPaginated`
- `useBandApplications` -> `bands.getApplications`
- `useMyBandApplications` -> `bands.getMyApplicationsPaginated`
- `useActiveListingCount` -> `bands.getActiveListingCount`

### My Music

- `useMyTracks` -> `myTracks.getMyTracks`
- `useMyTrackCount` -> `myTracks.getMyTrackCount`

### Search composition

- `useUnifiedSearch` currently composes `users.searchPaginated` and `communities.listPaginated`

## Backend Standards

1. Use `requireAuth(ctx)` for authenticated mutation paths.
2. Validate and sanitize shared write input before persistence.
3. Use indexes or indexed range scans in hot paths.
4. Prefer denormalized metadata for list previews/counts when needed.
5. Keep relationship mutations idempotent and symmetric when the model requires it.
6. Use cursor-safe cleanup strategies instead of repeatedly rereading first pages.

## Frontend Standards

1. `useQuery` for reactive single-resource reads and live state reads.
2. `usePaginatedQuery` for list UIs and infinite scroll.
3. `useMutation` for writes and real pending state.
4. TanStack Query is not the primary app-data layer for Convex-backed data.
5. TanStack Virtual is allowed only for rendering performance.
6. Do not hardcode fake loading or pending flags.

## Realtime Policy

### Tier A - must be realtime

1. `profiles.getMe`
2. newest DM page
3. DM inbox while visible
4. incoming friend requests

### Tier B - realtime only while the relevant screen is open

1. `posts.getById`
2. `comments.getByPostPaginated`
3. `users.getOnline`
4. `rooms.getByHandle`
5. `rooms.getParticipants`
6. `roomMessages.getLatest`
7. `rooms.getFriendsInRooms`
8. community/member-role single-resource reads while active

### Tier C - snapshot by default

1. feed lists
2. profile post lists
3. search results
4. friends list
5. community directories
6. band directories and application lists
7. my-track lists
8. active-room directories

## Banned Anti-patterns

1. `useInfiniteQuery` plus `convex.query(...)` for normal Convex pagination
2. manual limit/cursor endpoints where native pagination works
3. sorting by one field and cursoring by another
4. broad fallback scans in hot paths
5. declaring a rate-limit bucket and not enforcing it
6. render-time `setState`
7. changing message lifecycle state without syncing conversation preview fields
8. filtering paginated results in memory after `.paginate()` for user-visible filters

## PR Gate Checklist

1. Convex-backed data uses Convex hooks directly.
2. Query path is index-backed.
3. Native `.paginate()` is used unless the DM exception applies.
4. Mutations include auth, validation/sanitization, and rate limit coverage where appropriate.
5. Pagination boundaries have been checked for duplicates/skips.
6. `npm run convex:pull`, targeted lint, and build pass.
