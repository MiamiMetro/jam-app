# Backend Mock Inventory

This document tracks what is fully backend-backed versus what is still stubbed or missing in the UI.

## Status Overview

| Feature | Status | Notes |
| --- | --- | --- |
| Auth | Real | Better Auth plus Convex auth/session flow |
| Profiles and settings | Real | Profile edit, username change, soft delete, DM privacy |
| Friends | Real | Requests, accept/decline, friend list, suggestions |
| DMs | Real | Conversations, messages, read state, delete |
| Posts and comments | Real | Text/audio create, likes, pagination, replies, soft delete, likers |
| Presence | Real | Convex Presence heartbeat and status tracking |
| Communities | Real | CRUD, join/leave, moderation, member search, community posts |
| Jams and rooms | Real | Room CRUD, handle URLs, presence-backed participants |
| Jam room chat | Real | Convex-backed latest-message feed and send mutation |
| Bands | Real | Listings, filters, applications, owner actions |
| My Music | Real | Track uploads, paginated library, delete |
| Blocking | Backend only | Backend exists, frontend UI still missing |
| Email/password account management | Stub | Settings still shows placeholders |

## Fully Real Product Areas

### Communities

- Convex tables and indexes exist for communities and memberships.
- Frontend uses native paginated hooks for lists, joined communities, members, and member search.
- Community posts are integrated into the main post system.

### Jams and rooms

- Rooms are Convex-backed with handle routing, room CRUD, and presence-backed participants.
- Jam room chat is live through Convex.
- Stream URL and room status update paths exist for server-side integration.

### Bands

- `convex/bands.ts` owns listings and applications.
- Listing browse/search/filter flows are native paginated Convex queries.
- Owner-only application review is real.
- `My Listings`, `My Applications`, and public profile band-listing views are real.

### My Music

- `convex/myTracks.ts` owns per-user track metadata.
- Upload completion writes real metadata into Convex.
- The desktop UI uses paginated track reads, real count limits, playback, and delete.

### Posts, comments, likes, and replies

- Audio metadata is real.
- Comment replies are real.
- Post/comment delete flows are real.
- Post likers dialog is real.

## Remaining Frontend Gaps

### Blocking UI

Backend is complete, but frontend still needs:

1. block/unblock actions on profiles and relevant menus
2. blocked-users management UI in Settings
3. frontend hooks for block list and actions

### Account management

Settings still contains placeholders for:

1. email change
2. password change

These are product/UI gaps, not missing Convex ownership of the rest of the app state.

## Practical Read

If someone asks whether these surfaces are still mocked, the answer is:

- communities: no
- jams/rooms: no
- room chat: no
- feed suggestions: no
- bands: no
- my music: no
- blocking UI: still missing
- email/password management: still missing
