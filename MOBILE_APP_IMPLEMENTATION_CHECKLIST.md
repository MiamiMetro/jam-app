# Jam Mobile Compatibility Implementation Checklist

> **For agentic workers:** Use this as the execution checklist after reading `MOBILE_APP_AUDIT.md`. Work top to bottom unless a task explicitly says it can be done independently. Keep this file and `MOBILE_APP_AUDIT.md` uncommitted unless the user later asks to commit planning docs.

**Goal:** When every checklist item is complete, the mobile app should feel like a native iOS/Android adaptation of the desktop Jam app: same product surfaces, matching light/dark visual system, copied hook contracts where practical, native-feeling navigation, fixed tab/safe-area behavior, and audited screen parity.

**Architecture:** Keep mobile as its own app, not a shared source-of-truth UI. Copy desktop hook shapes into `apps/mobile/src/hooks` where practical, keep React Native-only audio/upload/navigation code mobile-local, and introduce a small mobile design system that maps desktop recipes to native components.

**Tech Stack:** Expo SDK 55, React Native 0.83, React 19, Convex, Better Auth, `expo-audio`, `expo-document-picker`, `react-native-safe-area-context`, and preferably Expo Router `NativeTabs`.

---

## Non-Commit Guardrails

- [ ] Do not commit `MOBILE_APP_AUDIT.md`.
- [ ] Do not commit this file.
- [ ] Do not commit the existing `apps/mobile/app.json` `appleTeamId` workspace change unless the user explicitly asks.
- [ ] Before any implementation commit, run `git status --short` and stage only intended code files.

## Definition Of Done

The mobile app is considered compatible only when all of these are true:

- [ ] Main mobile navigation exposes the same primary product areas as desktop or documents an intentional mobile exception: Jams, Feed, Messages/Friends, Communities, Bands, My Music, Profile/Settings.
- [ ] Bottom navigation feels native and respects safe areas on iOS simulator sizes.
- [ ] All screens render correctly in both light and dark mobile themes.
- [ ] Hard-coded screen colors are removed or limited to semantic badges/status states.
- [ ] Mobile hooks match desktop hook names and return shapes where React Native permits direct copying.
- [ ] Screens use mobile hooks instead of direct Convex calls for core domain actions.
- [ ] Every screen listed in `MOBILE_APP_AUDIT.md` has been redesigned or explicitly accepted as already matching the desktop counterpart.
- [ ] Auth, compose, comments, chat, create/apply modals, and upload flows are keyboard-safe.
- [ ] Every list/scroll screen has bottom inset padding so content never sits behind tabs or the home indicator.
- [ ] Accessibility labels and roles are correct for icon buttons, row actions, cards, tabs, and composer controls.
- [ ] `npm run mobile:ios` or equivalent Expo iOS run works.
- [ ] TypeScript validation passes for mobile.
- [ ] A simulator QA pass verifies Jams, Feed, Messages, Profile, More/replacement tabs, My Music, Communities, Community Detail, Bands, Post Detail, Conversation, Jam Room, Settings, Login, Register, and Profile Setup.

---

## Phase 0: Baseline And Safety

### Task 0.1: Capture Baseline State

**Files:**

- Read: `MOBILE_APP_AUDIT.md`
- Read: `apps/mobile/package.json`
- Read: `apps/mobile/app.json`
- Read: `apps/desktop/docs/DESIGN_SYSTEM.md`

- [ ] Run `git status --short`.
- [ ] Confirm `apps/mobile/app.json` may already be modified and should not be accidentally staged.
- [ ] Run `npm run mobile:ios` or use the current simulator/dev-client workflow.
- [ ] Capture screenshots for the current mobile app before changes:
  - Jams
  - Feed
  - Messages
  - Profile
  - More
  - My Music
  - Communities
  - Community Detail
  - Bands
  - Post Detail
  - Conversation
  - Jam Room
  - Settings
  - Login/Register/Profile Setup if reachable
- [ ] Save screenshots outside git or under a gitignored artifact directory.

**Acceptance:**

- [ ] Baseline screenshots exist.
- [ ] The current dirty files are known.
- [ ] No planning files or unrelated config changes are staged.

### Task 0.2: Decide Navigation Migration Scope

**Files:**

- Read: `apps/mobile/src/navigation/MainTabs.tsx`
- Read: `apps/mobile/src/navigation/RootNavigator.tsx`
- Read: `apps/mobile/App.tsx`
- Read: `apps/mobile/package.json`

- [ ] Choose one implementation path:
  - Preferred: migrate to Expo Router and `expo-router/unstable-native-tabs`.
  - Interim: keep React Navigation and fix safe-area/tab behavior first.
- [ ] If choosing Expo Router, add a work note that route files will move from `src/navigation` to `app/`.
- [ ] If choosing interim React Navigation, add a work note that native tabs remain unresolved and must be revisited.

**Acceptance:**

- [ ] The chosen path is documented in the implementation PR/body or a local working note.
- [ ] The path explicitly addresses the audit complaint that the bottom tab sits too low and does not feel native.

---

## Phase 1: Theme And Mobile Design System

### Task 1.1: Create Mobile Design Tokens

**Files:**

- Create: `apps/mobile/src/theme/mobileTokens.ts`
- Modify: `apps/mobile/src/theme/MobileTheme.tsx`
- Reference: `apps/desktop/src/ui/index.css`
- Reference: `apps/desktop/docs/DESIGN_SYSTEM.md`

- [ ] Create desktop-aligned tokens for dark and light:
  - `background`
  - `foreground`
  - `card`
  - `cardForeground`
  - `popover`
  - `muted`
  - `mutedForeground`
  - `primary`
  - `primaryForeground`
  - `secondary`
  - `secondaryForeground`
  - `accent`
  - `accentForeground`
  - `destructive`
  - `border`
  - `borderStrong`
  - `input`
  - `ring`
  - `success`
  - `warning`
- [ ] Keep `MobileThemeColors` backward compatible until all screens are migrated.
- [ ] Export reusable spacing/radius/shadow recipes:
  - `surface`
  - `surfaceStrong`
  - `heroCard`
  - `listRow`
  - `filterPill`
  - `actionBar`
  - `formInput`

**Acceptance:**

- [ ] `MobileThemeProvider` consumes tokens from `mobileTokens.ts`.
- [ ] Existing screens still compile after adding tokens.
- [ ] Light and dark token names map cleanly to desktop CSS variable names.

### Task 1.2: Fix App Theme Configuration

**Files:**

- Modify: `apps/mobile/app.json`
- Modify: `apps/mobile/src/theme/MobileTheme.tsx`

- [ ] Change `userInterfaceStyle` from forced light to `automatic`, unless product decision says dark-only.
- [ ] Set splash and system UI background colors to values compatible with the default resolved theme.
- [ ] Decide whether mobile default is `system` or `dark`.
- [ ] Keep theme persistence through `expo-secure-store`.

**Acceptance:**

- [ ] iOS status bar and system background match the resolved mobile theme.
- [ ] Dark and light screenshots do not show mixed hard-coded dark cards in light mode.
- [ ] Existing unrelated `appleTeamId` change is not treated as part of this task unless intentionally accepted.

### Task 1.3: Add Mobile UI Primitives

**Files:**

- Create: `apps/mobile/src/components/ui/PageScaffold.tsx`
- Create: `apps/mobile/src/components/ui/SectionHeader.tsx`
- Create: `apps/mobile/src/components/ui/Surface.tsx`
- Create: `apps/mobile/src/components/ui/ListRow.tsx`
- Create: `apps/mobile/src/components/ui/FilterPill.tsx`
- Create: `apps/mobile/src/components/ui/ActionBar.tsx`
- Create: `apps/mobile/src/components/ui/FormField.tsx`
- Create: `apps/mobile/src/components/ui/EmptyState.tsx`

- [ ] `PageScaffold` handles background, top inset, optional native header gap, and bottom padding.
- [ ] `SectionHeader` mirrors desktop small uppercase/dense section titles.
- [ ] `Surface` supports `default`, `strong`, `hero`, and `pressed`.
- [ ] `ListRow` supports avatar/icon, title, subtitle, metadata, trailing action, and selected state.
- [ ] `FilterPill` supports selected/unselected states and horizontal rows.
- [ ] `ActionBar` standardizes like/comment/share rows.
- [ ] `FormField` standardizes labels, hints, errors, and text input styling.
- [ ] `EmptyState` replaces ad hoc empty screens.

**Acceptance:**

- [ ] New primitives use `useMobileTheme`.
- [ ] New primitives expose accessibility roles/labels where relevant.
- [ ] No primitive depends on desktop web libraries.

### Task 1.4: Remove Hard-Coded Screen Colors

**Files:**

- Modify: `apps/mobile/src/screens/Bands/BandsScreen.tsx`
- Modify: `apps/mobile/src/screens/Community/CommunityScreen.tsx`
- Modify: `apps/mobile/src/screens/Community/CommunityDetailScreen.tsx`
- Modify: `apps/mobile/src/screens/Jams/JamRoomScreen.tsx`
- Modify: `apps/mobile/src/components/jams/JamStreamPlayer.tsx`
- Modify any other file found by `rg -n "#[0-9A-Fa-f]{6}|rgba\\(" apps/mobile/src`

- [ ] Replace hard-coded background/card/text colors with mobile tokens.
- [ ] Keep semantic colors only for status badges, destructive states, success states, and genre/community accents.
- [ ] Confirm light mode no longer renders dark-only cards or text.
- [ ] Confirm dark mode still matches desktop Dark Studio.

**Acceptance:**

- [ ] `rg -n "#1A1E29|#262B37|#D8A64A|#EEF0F5|#1E2330|#353B49" apps/mobile/src` returns no screen-level styling except token definitions.
- [ ] Screens are readable in both themes.

---

## Phase 2: Navigation And Native Feel

### Task 2.1: Preferred Path - Migrate To Expo Router Native Tabs

**Files:**

- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/jams.tsx`
- Create: `apps/mobile/app/(tabs)/feed.tsx`
- Create: `apps/mobile/app/(tabs)/messages.tsx`
- Create: `apps/mobile/app/(tabs)/communities.tsx`
- Create: `apps/mobile/app/(tabs)/bands.tsx`
- Create: `apps/mobile/app/(tabs)/my-music.tsx`
- Create: stack routes for profile, settings, post detail, conversation, community detail, jam room, login, register, profile setup.
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/App.tsx`
- Remove or stop using: `apps/mobile/src/navigation/MainTabs.tsx`
- Remove or stop using: `apps/mobile/src/navigation/RootNavigator.tsx`

- [ ] Install/add `expo-router` if missing.
- [ ] Move providers from `App.tsx` into Expo Router root layout.
- [ ] Create `NativeTabs` with static triggers:
  - Jams: `music.note.list` / `music_note`
  - Feed: `dot.radiowaves.left.and.right` / `rss_feed`
  - Messages: `message` / `chat_bubble`
  - Communities: `person.3` / `groups`
  - Bands: `guitars` or nearest SF Symbol / `music_note`
  - My Music: `record.circle` / `album`
- [ ] Use native stack headers for detail routes where practical.
- [ ] Use native search bars where practical for list screens.
- [ ] Keep Profile and Settings as stack routes unless product decides Profile remains a tab.

**Acceptance:**

- [ ] The bottom tab is rendered by native tab infrastructure.
- [ ] Tabs respect safe areas and do not sit visually on the home indicator.
- [ ] Primary desktop destinations are first-class mobile destinations or the exception is documented.
- [ ] Deep navigation to post, conversation, community detail, jam room, profile, and settings works.

### Task 2.2: Interim Path - Fix React Navigation Tabs

Use this task only if Task 2.1 is deferred.

**Files:**

- Modify: `apps/mobile/src/navigation/MainTabs.tsx`
- Modify list screens that need bottom padding.

- [ ] Use `useSafeAreaInsets` to compute tab height.
- [ ] Add bottom inset to `tabBarStyle.height` and `paddingBottom`.
- [ ] Remove or soften the focused icon pill.
- [ ] Ensure every list screen has `contentContainerStyle.paddingBottom` large enough for tab bar plus safe area.
- [ ] Re-evaluate whether `More` should remain a tab.

**Acceptance:**

- [ ] Simulator screenshot shows a native-feeling tab position.
- [ ] Last list item is not obscured on Jams, Feed, Messages, Profile, or More.
- [ ] Keyboard hiding behavior still works.

### Task 2.3: Standardize Stack Headers And Insets

**Files:**

- Modify all route/screen entry files under `apps/mobile/src/screens`
- Modify any Expo Router route files if Task 2.1 is used.

- [ ] Replace custom top header blocks with native stack titles where practical.
- [ ] Keep custom rich headers only for profile, community detail, jam room, and other content-heavy screens.
- [ ] Ensure `ScrollView`, `FlatList`, and `SectionList` use correct top/bottom insets.
- [ ] Add keyboard-safe wrappers for form/chat/comment screens.

**Acceptance:**

- [ ] Back buttons are native or match native behavior.
- [ ] No screen content starts under the Dynamic Island/status area.
- [ ] No screen content ends behind tabs/home indicator.

---

## Phase 3: Hook Parity

### Task 3.1: Port Full Post Hooks

**Files:**

- Modify: `apps/mobile/src/hooks/usePosts.tsx`
- Modify or replace: `apps/mobile/src/hooks/useProfilePosts.tsx`
- Reference: `apps/desktop/src/ui/hooks/usePosts.ts`
- Update consumers:
  - `apps/mobile/src/components/posts/PostItem.tsx`
  - `apps/mobile/src/components/posts/ComposePost.tsx`
  - `apps/mobile/src/screens/Posts/PostDetailScreen.tsx`
  - `apps/mobile/src/components/comments/CommentItem.tsx`

- [ ] Add mobile equivalents for:
  - `usePosts`
  - `useCommunityPosts`
  - `useGlobalPosts`
  - `usePost`
  - `useComments`
  - `useCreateComment`
  - `useCreatePost`
  - `useDeletePost`
  - `useToggleLike`
  - `useToggleCommentLike`
  - `useDeleteComment`
  - `usePostLikes`
  - `useUserPosts`
  - `useReplies`
  - `useCreateReply`
- [ ] Preserve desktop return names where React Native permits.
- [ ] Keep mobile upload/audio file conversion inside mobile components or `useMediaUpload`.
- [ ] Replace direct post/comment Convex mutation calls in components with hooks.

**Acceptance:**

- [ ] `rg -n "api\\.posts|api\\.comments" apps/mobile/src/components apps/mobile/src/screens` shows domain calls only inside hooks or clearly justified route loaders.
- [ ] Feed, Profile posts, Post Detail, comments, replies, likes, and deletes still work.

### Task 3.2: Port Friends And Users Hooks

**Files:**

- Create: `apps/mobile/src/hooks/useFriends.ts`
- Create: `apps/mobile/src/hooks/useUsers.ts`
- Reference: `apps/desktop/src/ui/hooks/useFriends.ts`
- Reference: `apps/desktop/src/ui/hooks/useUsers.ts`
- Update:
  - `apps/mobile/src/screens/Messages/MessagesScreen.tsx`
  - `apps/mobile/src/screens/Messages/ConversationScreen.tsx`
  - Profile and user row components that need profile/friend data.

- [ ] Add friends hooks:
  - `useFriends`
  - `useFriendRequests`
  - `useRequestFriend`
  - `useAcceptFriend`
  - `useDeclineFriend`
  - `useDeleteFriend`
  - `useCancelFriendRequest`
  - `useSentFriendRequests`
  - `useFriendsCount`
  - `useSuggestedFriends`
- [ ] Add users/messages hooks:
  - `useOnlineUsers`
  - `useOnlineIdsSnapshot` if mobile needs efficient status rings.
  - `useUser`
  - `useProfileCatalog`
  - `useMe`
  - `useUpdateProfile`
  - `useSoftDeleteProfile`
  - `useAllUsers`
  - `useConversationParticipants`
  - `useConversations`
  - `useEnsureDmConversation`
  - `useMessages`
  - `useSendMessage`
  - `useMarkAsRead`
  - `useDeleteMessage`
- [ ] Move direct message/friend Convex calls out of `MessagesScreen` and `ConversationScreen`.

**Acceptance:**

- [ ] `rg -n "api\\.friends|api\\.users|api\\.messages" apps/mobile/src/screens apps/mobile/src/components` returns no direct calls outside hooks, except route-specific one-off reads that are documented.
- [ ] Messages, friend search, requests, DM creation, send/read/delete, and participant display work.
- [ ] Online/presence indicators display where desktop has them.

### Task 3.3: Expand Room Hooks

**Files:**

- Modify: `apps/mobile/src/hooks/useRooms.tsx`
- Modify: `apps/mobile/src/hooks/useJamRoomPresence.ts`
- Reference: `apps/desktop/src/ui/hooks/useRooms.ts`
- Update:
  - `apps/mobile/src/screens/Jams/JamScreen.tsx`
  - `apps/mobile/src/screens/Jams/JamRoomScreen.tsx`
  - `apps/mobile/src/screens/Community/CommunityDetailScreen.tsx`
  - jam room components.

- [ ] Add mobile equivalents for:
  - `useRoomMessages`
  - `useSendRoomMessage`
  - `useGuestRoomHeartbeat`
  - `useDeleteRoom`
  - `useSetStreamUrl`
  - `useUpdateRoomStatus`
  - `useCreatePerformerJoinToken`
  - `useRefreshJamSession`
  - `useStartListenerMode`
  - `useStopListenerMode`
  - `useRefreshListenerMode`
- [ ] Preserve current basic hooks:
  - `useRooms`
  - `useRoom`
  - `useMyRoom`
  - `useMyCommunityRoom`
  - `useCommunityRooms`
  - `useFriendsInRooms`
  - `useRoomParticipants`
  - `useRoomHeartbeat`
  - `useDisconnectPresence`
  - `useCreateRoom`
  - `useUpdateRoom`
  - `useActivateRoom`
  - `useDeactivateRoom`
- [ ] Update Jam Room to use hook-based chat/control/listener APIs.

**Acceptance:**

- [ ] Mobile Jam Room supports listening, chat, participant display, and room controls that match desktop where mobile platform allows.
- [ ] Presence connects and disconnects cleanly when entering/leaving rooms.

### Task 3.4: Complete Communities Hooks

**Files:**

- Modify: `apps/mobile/src/hooks/useCommunities.tsx`
- Reference: `apps/desktop/src/ui/hooks/useCommunities.ts`
- Update:
  - `apps/mobile/src/screens/Community/CommunityScreen.tsx`
  - `apps/mobile/src/screens/Community/CommunityDetailScreen.tsx`

- [ ] Add `useCommunityJamServerSettings`.
- [ ] Add `useUpdateCommunityJamServerSettings`.
- [ ] Align naming with desktop for created count and joined communities.
- [ ] Keep mobile-specific pending/error wrappers only when they improve UI feedback.

**Acceptance:**

- [ ] Community list, create, update, join, leave, mod actions, members, member search, community posts, community rooms, and jam settings work.

### Task 3.5: Align Bands Hooks

**Files:**

- Modify: `apps/mobile/src/hooks/useBands.tsx`
- Reference: `apps/desktop/src/ui/hooks/useBands.ts`
- Update: `apps/mobile/src/screens/Bands/BandsScreen.tsx`

- [ ] Decide whether mobile should expose desktop `useRespondToBandApplication` or keep `useAcceptBandApplication` and `useRejectBandApplication` wrappers.
- [ ] If backend supports `api.bands.respondToApplication`, prefer desktop naming.
- [ ] Keep:
  - `useBandListings`
  - `useMyBandListings`
  - `useActiveListingCount`
  - `useBandApplications`
  - `useMyBandApplications`
  - `useMyBands`
  - `useUserBandListings`
  - `useCreateBandListing`
  - `useCloseBandListing`
  - `useDeleteBandListing`
  - `useApplyToBand`

**Acceptance:**

- [ ] Bands screen can list, search, filter, create, apply, close, delete, and respond to applications.
- [ ] Hook names and result shapes are as close to desktop as possible.

### Task 3.6: Add Unified Search Where It Belongs

**Files:**

- Create: `apps/mobile/src/hooks/useUnifiedSearch.ts`
- Reference: `apps/desktop/src/ui/hooks/useUnifiedSearch.ts`
- Create or update mobile search UI if product wants desktop-like global search.

- [ ] Port unified search hook shape.
- [ ] Decide mobile entry point:
  - native search tab
  - search route
  - search bar in key tabs
- [ ] Include posts, users, communities, rooms, and bands if desktop does.

**Acceptance:**

- [ ] Search behavior uses the same backend functions and return grouping as desktop.

---

## Phase 4: Screen Parity Work

### Task 4.1: Auth Screens

**Files:**

- Modify: `apps/mobile/src/screens/Auth/LoginScreen.tsx`
- Modify: `apps/mobile/src/screens/Auth/RegisterScreen.tsx`
- Modify: `apps/mobile/src/screens/Auth/ProfileSetupScreen.tsx`

- [ ] Apply mobile tokens and shared `FormField`.
- [ ] Add keyboard-aware scrolling.
- [ ] Add restrained Jam logo/brand treatment matching desktop assets.
- [ ] Keep full-screen auth unless Expo Router modal auth is intentionally chosen.
- [ ] Confirm errors are selectable/readable.

**Acceptance:**

- [ ] Login, register, and profile setup are readable in light/dark.
- [ ] Keyboard does not obscure fields or submit buttons.
- [ ] Auth still works through Better Auth and Convex.

### Task 4.2: Jams Screen

**Files:**

- Modify: `apps/mobile/src/screens/Jams/JamScreen.tsx`
- Modify: `apps/mobile/src/components/jams/JamList.tsx`
- Modify: `apps/mobile/src/components/jams/JamItem.tsx`

- [ ] Map My Room to `Surface` hero style.
- [ ] Add create room action in header/toolbar.
- [ ] Add grid/list toggle if mobile product keeps both.
- [ ] Add Friends Jamming Now rail using `useFriendsInRooms`.
- [ ] Align live room cards with desktop room card content.
- [ ] Add bottom inset padding.

**Acceptance:**

- [ ] Jams mobile includes desktop-equivalent discovery, My Room, room list/grid, create, and friends jamming affordances.
- [ ] Tapping rooms opens Jam Room.

### Task 4.3: Feed Screen

**Files:**

- Modify: `apps/mobile/src/screens/Home/HomeScreen.tsx`
- Modify: `apps/mobile/src/components/posts/ComposePost.tsx`
- Modify: `apps/mobile/src/components/posts/PostList.tsx`
- Modify: `apps/mobile/src/components/posts/PostItem.tsx`

- [ ] Add Active Jams horizontal rail.
- [ ] Add Suggested Friends horizontal rail after `useFriends` is available.
- [ ] Update composer to match desktop fields and controls: text, upload audio, record where supported, post.
- [ ] Use hook-based post actions.
- [ ] Use shared `ActionBar`.
- [ ] Add bottom inset padding.

**Acceptance:**

- [ ] Feed contains composer, posts, active jams, suggested friends, and desktop-equivalent post actions.
- [ ] Audio upload/record state is clear and iOS-compatible.

### Task 4.4: Messages/Friends Screen

**Files:**

- Modify: `apps/mobile/src/screens/Messages/MessagesScreen.tsx`
- Modify: `apps/mobile/src/screens/Messages/ConversationScreen.tsx`
- Create smaller components under `apps/mobile/src/components/messages/` as needed.

- [ ] Rename sections to desktop-aligned concepts: Conversations, Friends, Requests, Find People.
- [ ] Use `useFriends` and `useUsers`.
- [ ] Add online status rings/badges.
- [ ] Add friend request management.
- [ ] Add user search and DM creation.
- [ ] Make conversation composer keyboard-safe.
- [ ] Add bottom inset padding.

**Acceptance:**

- [ ] Mobile covers desktop FriendsTab core workflows on phone: conversations, find people, requests, friend list, DM.
- [ ] Direct Convex message/friend calls are gone from screens.

### Task 4.5: Profile And Settings

**Files:**

- Modify: `apps/mobile/src/screens/Profile/ProfileScreen.tsx`
- Modify: `apps/mobile/src/components/profile/ProfileHeader.tsx`
- Modify: `apps/mobile/src/screens/Settings/SettingsScreen.tsx`
- Add public profile route/screen if missing.

- [ ] Remove large blank gap in Profile header.
- [ ] Add avatar, display name, username, stats, edit/settings actions.
- [ ] Add route for viewing other users' profiles.
- [ ] Use `useUser`, `useUserPosts`, `useFriendsCount`, and profile update hooks.
- [ ] Expose Settings from Profile and More or a native account route.
- [ ] Align settings with desktop: theme, censorship if available, account, profile, app/about.

**Acceptance:**

- [ ] Current profile and public profiles work.
- [ ] Settings controls persist and mirror desktop concepts.

### Task 4.6: Replace Or Upgrade More

**Files:**

- Modify or remove: `apps/mobile/src/screens/More/MoreScreen.tsx`
- Modify navigation route definitions.

- [ ] If native tabs expose Communities, Bands, and My Music directly, remove More as a primary tab.
- [ ] If More remains, add Settings, Profile/account, theme, and recent/secondary destinations.
- [ ] Do not bury desktop primary surfaces unless product explicitly accepts it.

**Acceptance:**

- [ ] Navigation no longer makes desktop primary areas feel hidden.

### Task 4.7: My Music

**Files:**

- Modify: `apps/mobile/src/screens/Music/MyMusicScreen.tsx`
- Modify: `apps/mobile/src/hooks/useMyTracks.tsx`

- [ ] Preserve desktop `My Library` and `Upload` structure.
- [ ] Match desktop empty state.
- [ ] Use native document picker/upload flow.
- [ ] Use themed list rows for track metadata and actions.
- [ ] Add bottom inset padding.

**Acceptance:**

- [ ] User can view, upload, and delete tracks.
- [ ] Empty and loading states match desktop intent.

### Task 4.8: Communities List And Detail

**Files:**

- Modify: `apps/mobile/src/screens/Community/CommunityScreen.tsx`
- Modify: `apps/mobile/src/screens/Community/CommunityDetailScreen.tsx`
- Create smaller components under `apps/mobile/src/components/communities/` as needed.

- [ ] List screen: page title, search, create action, tag pill bar, dense list rows.
- [ ] Detail screen: split into header, tabs, feed, members, jam panel, room form, member row.
- [ ] Use missing community jam settings hooks.
- [ ] Convert modals to native stack modal/form-sheet if Expo Router is adopted.
- [ ] Remove hard-coded colors.

**Acceptance:**

- [ ] Community list and detail support browse, search, create, join, leave, member management, posts, rooms, and jam settings.

### Task 4.9: Bands

**Files:**

- Modify: `apps/mobile/src/screens/Bands/BandsScreen.tsx`
- Create smaller components under `apps/mobile/src/components/bands/` as needed.

- [ ] Split large screen into focused components.
- [ ] Match desktop structure: All Listings, My Listings, My Bands, search, role filter pills, Create Listing, Apply.
- [ ] Use themed list rows and modals/sheets.
- [ ] Use aligned bands hooks.
- [ ] Remove hard-coded colors.

**Acceptance:**

- [ ] Bands workflows match desktop on mobile: browse, filter, create, apply, manage own listings, review applications, view joined bands.

### Task 4.10: Post Detail And Comments

**Files:**

- Modify: `apps/mobile/src/screens/Posts/PostDetailScreen.tsx`
- Modify: `apps/mobile/src/components/comments/CommentComposer.tsx`
- Modify: `apps/mobile/src/components/comments/CommentItem.tsx`

- [ ] Use full post/comment hooks.
- [ ] Use native stack header.
- [ ] Add keyboard-safe comment composer.
- [ ] Preserve threaded replies.
- [ ] Add bottom inset padding.
- [ ] Add accessibility labels for like, reply, delete, load more replies.

**Acceptance:**

- [ ] Post detail supports view, like, delete own post, comment, reply, like comments, delete own comments, and pagination.

### Task 4.11: Jam Room

**Files:**

- Modify: `apps/mobile/src/screens/Jams/JamRoomScreen.tsx`
- Modify: `apps/mobile/src/components/jams/JamStreamPlayer.tsx`
- Modify: `apps/mobile/src/components/jams/JamRoomPresence` components if created.

- [ ] Add sections for Now Playing, Chat, People, and Settings/Controls.
- [ ] Use expanded room hooks.
- [ ] Keep `expo-audio` for native playback.
- [ ] Align player states and labels with desktop HLS/listener behavior.
- [ ] Add participant presence and room chat.
- [ ] Add room control actions available to host/mods.

**Acceptance:**

- [ ] Jam Room supports listener playback, participant presence, room chat, and host controls comparable to desktop.

---

## Phase 5: Accessibility, Native Behavior, And QA

### Task 5.1: Accessibility Pass

**Files:**

- Modify all screen/component files touched above.

- [ ] Add `accessibilityRole="button"` to pressable rows and controls.
- [ ] Add labels for icon-only buttons.
- [ ] Prevent decorative icons from polluting labels.
- [ ] Use readable labels for tab destinations.
- [ ] Ensure important error text is selectable or announced.
- [ ] Confirm row actions have understandable labels.

**Acceptance:**

- [ ] Simulator accessibility hierarchy no longer shows icon font glyphs as primary labels for important controls.

### Task 5.2: Keyboard And Insets Pass

**Files:**

- Modify:
  - auth screens
  - feed composer
  - post detail comments
  - conversation composer
  - community forms
  - bands forms
  - settings forms

- [ ] Add keyboard-aware layout where text inputs are near the bottom.
- [ ] Add tab/safe-area bottom padding to every scroll/list screen.
- [ ] Test portrait iPhone standard and Pro Max simulator sizes.

**Acceptance:**

- [ ] Keyboard never covers active input or submit action.
- [ ] Last row/card remains visible above tab bar/home indicator.

### Task 5.3: Verification Commands

**Files:**

- `apps/mobile/package.json`
- root `package.json`

- [ ] Run `npm run mobile:ios`.
- [ ] Run mobile TypeScript validation. If no script exists, add one such as `typecheck: tsc --noEmit` in `apps/mobile/package.json`, then run it.
- [ ] Run any existing lint/test commands for mobile if present.
- [ ] Run `npx expo-doctor` from `apps/mobile` if dependencies changed.

**Acceptance:**

- [ ] iOS build/run succeeds.
- [ ] TypeScript passes.
- [ ] Expo doctor has no blocking dependency issues.

### Task 5.4: Final Simulator QA Matrix

**Screens:**

- [ ] Login
- [ ] Register
- [ ] Profile Setup
- [ ] Jams
- [ ] Feed
- [ ] Messages/Friends
- [ ] Profile
- [ ] Settings
- [ ] My Music
- [ ] Communities
- [ ] Community Detail
- [ ] Bands
- [ ] Post Detail
- [ ] Conversation
- [ ] Jam Room

**For each screen:**

- [ ] Light theme screenshot.
- [ ] Dark theme screenshot.
- [ ] Scroll bottom check.
- [ ] Keyboard check if applicable.
- [ ] Accessibility label spot-check.
- [ ] Desktop parity check against `MOBILE_APP_AUDIT.md`.

**Acceptance:**

- [ ] All screens pass the matrix.
- [ ] Any intentionally deferred desktop parity gap is listed in a follow-up section with rationale.

---

## Final Completion Audit

Before calling the implementation complete:

- [ ] Re-read `MOBILE_APP_AUDIT.md`.
- [ ] For each audit finding, point to a completed checklist task or a documented product exception.
- [ ] Run `git status --short` and verify planning files and unrelated `app.json` changes are not staged.
- [ ] Verify native tabs or interim tab fix addresses the original "bottom tab is at really bottom" issue with a simulator screenshot.
- [ ] Verify desktop hook parity by comparing:
  - `apps/desktop/src/ui/hooks/usePosts.ts` vs `apps/mobile/src/hooks/usePosts.tsx`
  - `apps/desktop/src/ui/hooks/useRooms.ts` vs `apps/mobile/src/hooks/useRooms.tsx`
  - `apps/desktop/src/ui/hooks/useFriends.ts` vs `apps/mobile/src/hooks/useFriends.ts`
  - `apps/desktop/src/ui/hooks/useUsers.ts` vs `apps/mobile/src/hooks/useUsers.ts`
  - `apps/desktop/src/ui/hooks/useCommunities.ts` vs `apps/mobile/src/hooks/useCommunities.tsx`
  - `apps/desktop/src/ui/hooks/useBands.ts` vs `apps/mobile/src/hooks/useBands.tsx`
  - `apps/desktop/src/ui/hooks/useMyTracks.ts` vs `apps/mobile/src/hooks/useMyTracks.tsx`
- [ ] Verify all hard-coded color removals with `rg`.
- [ ] Verify all screens in the QA matrix.
- [ ] Only then mark the mobile compatibility implementation complete.

