# Convex Frontend Connections Inventory

Last updated: 2026-04-13

This file lists the current Convex connections used by the frontend and how they are consumed.

## Connection Types

1. `Live Subscription`
   - uses `useQuery(...)`
2. `Live Paginated Subscription`
   - uses `usePaginatedQuery(...)`
3. `One-Shot Query`
   - uses `useConvex().query(...)`
4. `Mutation`
   - uses `useMutation(...)`
5. `Transport/Auth Wiring`
   - app-level Convex client/provider/auth integration

## Live Subscriptions (`useQuery`)

### Profiles and users

- `api.profiles.getMe`
- `api.profiles.getByUsername`
- `api.profiles.getProfileCatalog`
- `api.users.getOnline`

### Friends

- `api.friends.getCount`
- `api.friends.getSuggested`

### Posts

- `api.posts.getById`

### Communities

- `api.communities.getByHandle`
- `api.communities.getById`
- `api.communities.getMemberRole`
- `api.communities.getCreatedCount`

### Rooms

- `api.rooms.getByHandle`
- `api.rooms.getMyRoom`
- `api.rooms.getParticipants`
- `api.rooms.getFriendsInRooms`
- `api.roomMessages.getLatest`

### Messages

- `api.messages.getParticipants`
- newest-page `api.messages.getByConversationPaginated`

### Bands and tracks

- `api.bands.getActiveListingCount`
- `api.myTracks.getMyTrackCount`

## Live Paginated Subscriptions (`usePaginatedQuery`)

### Posts and comments

- `api.posts.getFeedPaginated`
- `api.posts.getCommunityPostsPaginated`
- `api.posts.getByUsernamePaginated`
- `api.posts.getLikes`
- `api.comments.getByPostPaginated`
- `api.comments.getRepliesPaginated`

### Friends

- `api.friends.listPaginated`
- `api.friends.getRequestsPaginated`
- `api.friends.getSentRequestsWithDataPaginated`

### Users

- `api.users.searchPaginated`

### Messages

- `api.messages.getConversationsPaginated`

### Communities

- `api.communities.listPaginated`
- `api.communities.getJoined`
- `api.communities.getMembersPaginated`
- `api.communities.searchMembersPaginated`

### Rooms

- `api.rooms.listActivePaginated`

### Bands

- `api.bands.listPaginated`
- `api.bands.getMyListingsPaginated`
- `api.bands.getByUserPaginated`
- `api.bands.getApplications`
- `api.bands.getMyApplicationsPaginated`

### My Music

- `api.myTracks.getMyTracks`

## One-Shot Queries (`useConvex().query`)

### Messages

- older-page `api.messages.getByConversationPaginated`
- approved exception for older DM history pages only

## Mutations (`useMutation`)

### Profiles

- `api.profiles.createProfile`
- `api.profiles.updateMe`
- `api.profiles.softDeleteMe`

### Friends

- `api.friends.sendRequest`
- `api.friends.acceptRequest`
- `api.friends.remove`

### Posts and comments

- `api.posts.create`
- `api.posts.remove`
- `api.posts.toggleLike`
- `api.comments.create`
- `api.comments.reply`
- `api.comments.remove`
- `api.comments.toggleLike`

### Messages

- `api.messages.ensureDmWithUser`
- `api.messages.send`
- `api.messages.markAsRead`
- `api.messages.remove`

### Communities

- `api.communities.create`
- `api.communities.update`
- `api.communities.join`
- `api.communities.leave`
- `api.communities.promoteMod`
- `api.communities.demoteMod`
- `api.communities.removeMember`

### Rooms and presence

- `api.rooms.create`
- `api.rooms.update`
- `api.rooms.activate`
- `api.rooms.deactivate`
- `api.rooms.deleteRoom`
- `api.rooms.setStreamUrl`
- `api.rooms.updateRoomStatus`
- `api.roomMessages.send`
- `api.presence.heartbeat`
- `api.presence.disconnect`
- `api.presence.roomHeartbeat`
- `api.presence.guestRoomHeartbeat`
- `api.presence.setMyStatus`

### Bands

- `api.bands.createListing`
- `api.bands.closeListing`
- `api.bands.deleteListing`
- `api.bands.apply`

### My Music

- `api.myTracks.addTrack`
- `api.myTracks.deleteTrack`

## Composed Frontend Flows

1. `useUnifiedSearch`
   - composes `api.users.searchPaginated` and `api.communities.listPaginated`
2. `useMessages`
   - composes live newest-page reads with one-shot older-page loads

## Transport/Auth Wiring

1. Convex client creation in `src/ui/main.tsx`
2. Convex provider wiring in `src/ui/main.tsx`
3. auth sync through `useConvexAuth`

## Summary

1. Native Convex pagination is the standard for list UIs.
2. The only approved one-shot query path is older DM history loading.
3. Global search currently composes existing Convex endpoints rather than using a dedicated backend endpoint.
