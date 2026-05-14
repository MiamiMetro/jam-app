# Jam Mobile Audit

Date: 2026-05-14  
Scope: `apps/mobile` compared against the desktop app in `apps/desktop`  
Simulator checked: iPhone 17, iOS 26.3, running `jam-mobile`
Electron checked: `jam-desktop` dev runtime at `localhost:5123`, Electron window

## Executive Summary

The mobile app is functional, but it is not yet a close mobile translation of the desktop app. The biggest gap is not one isolated screen; it is that mobile has its own navigation, styling, hook surface, audio behavior, and several incomplete feature slices. The result feels like a separate prototype using the same backend rather than the desktop app adapted to iOS.

Top priorities:

1. Move navigation toward native-feeling tabs and native stack headers. The current `@react-navigation/bottom-tabs` implementation is custom-drawn and pinned low on the screen, which matches the simulator complaint.
2. Align the mobile theme with the desktop Dark Studio system. Mobile currently launches light-only at the config level and mixes theme tokens with many hard-coded dark colors.
3. Copy or port desktop hooks more directly where possible. Mobile has partial copies for posts, rooms, communities, bands, and tracks, but it omits important desktop hooks for friends, users/messages, post actions, room chat/control, profile updates, and search.
4. Rework each screen around the desktop information hierarchy, not only colors. Desktop pages use dense headers, glass surfaces, side panels, sticky filters, and explicit action bars. Mobile frequently has simplified lists and missing actions.

## Evidence

Code inspected:

- `apps/mobile/App.tsx`
- `apps/mobile/src/navigation/*`
- `apps/mobile/src/theme/MobileTheme.tsx`
- `apps/mobile/src/screens/**/*`
- `apps/mobile/src/components/**/*`
- `apps/mobile/src/hooks/**/*`
- `apps/desktop/src/ui/App.tsx`
- `apps/desktop/src/ui/layouts/AppLayout.tsx`
- `apps/desktop/src/ui/index.css`
- `apps/desktop/docs/DESIGN_SYSTEM.md`
- `apps/desktop/src/ui/hooks/**/*`
- desktop primary views under `apps/desktop/src/ui/components` and `apps/desktop/src/ui/pages`

Electron runtime inspected:

- `#/jams`: sidebar, page header, search, grid/list toggle, Create Room, live room grid.
- `#/feed`: composer, upload/record controls, feed list, right sidebar with Active Jams and Suggested users.
- `#/friends`: split layout with conversation list/search on the left and empty conversation detail on the right.
- `#/communities`: page header, search, create action, tag pill bar, dense community list.
- `#/bands`: view switcher, search, create listing action, role filter pills, dense listing rows.
- `#/my-music`: My Library/Upload tabs and centered empty state.

Simulator screenshots captured:

- Jams: `/var/folders/r7/gq16dlmd4n96x57wkk5pdpg00000gn/T/screenshot_optimized_6a954e35-3b01-4ff4-972b-bc51d3d4956c.jpg`
- Feed: `/var/folders/r7/gq16dlmd4n96x57wkk5pdpg00000gn/T/screenshot_optimized_27fbe842-2b6c-4503-a87b-15742d6d60f7.jpg`
- Messages: `/var/folders/r7/gq16dlmd4n96x57wkk5pdpg00000gn/T/screenshot_optimized_c6a70a81-ef55-4334-bc7f-68420d0cc081.jpg`
- Profile: `/var/folders/r7/gq16dlmd4n96x57wkk5pdpg00000gn/T/screenshot_optimized_9e2963bc-c1ea-462c-9512-5d7481c862b1.jpg`
- More: `/var/folders/r7/gq16dlmd4n96x57wkk5pdpg00000gn/T/screenshot_optimized_eca1e284-5174-4772-b4d4-1bf84e096a15.jpg`

## Navigation Audit

Current mobile navigation:

- `apps/mobile/App.tsx` uses `NavigationContainer`.
- `apps/mobile/src/navigation/RootNavigator.tsx` uses `createNativeStackNavigator`.
- `apps/mobile/src/navigation/MainTabs.tsx` uses `createBottomTabNavigator` from `@react-navigation/bottom-tabs`.
- Main tabs are `Jams`, `Feed`, `Messages`, `Profile`, `More`.
- Secondary app areas are hidden behind `More`: `MyMusic`, `Communities`, `Bands`, `Settings`, plus detail screens.

Findings:

- The bottom tab bar does not use Expo Router native tabs. The Expo SDK is `~55.0.4`, and the Expo UI skill recommends `NativeTabs` from `expo-router/unstable-native-tabs` for best iOS behavior. This repo does not currently use Expo Router, so adopting native tabs is a small navigation migration rather than a one-line swap.
- The tab bar is manually styled at 66px high with `paddingBottom: 8`. On the iPhone 17 simulator the tab buttons sit at y=816 on an 874pt screen, visually crowding the home indicator area.
- Stack headers are hidden globally. Screens draw their own headers, so they miss iOS-native large title behavior, search bars, back affordances, content inset adjustment, and system spacing.
- Desktop has six primary routes: `/feed`, `/jams`, `/friends`, `/communities`, `/bands`, `/my-music`. Mobile only exposes five tabs and collapses communities, bands, and music into More. That is a product decision, but it is not the same experience.

Recommendation:

- Move to Expo Router before attempting native tabs. Target structure:
  - `app/_layout.tsx` for providers.
  - `app/(tabs)/_layout.tsx` using `NativeTabs`.
  - Tabs: `jams`, `feed`, `messages`, `communities`, `bands`, `my-music` if parity is the goal.
  - Keep profile/settings as stack routes unless profile must remain a primary tab.
- If a full Expo Router migration is too large for the first pass, keep React Navigation but fix safe-area behavior and tab height now:
  - use `useSafeAreaInsets`
  - include bottom inset in tab height
  - stop drawing content under the tab bar
  - remove the focused icon pill or make it much subtler

## Theme And Visual System Audit

Desktop source of truth:

- Desktop design system is `Dark Studio`: deep blue/charcoal backgrounds, warm amber primary, subtle borders, glass-solid/glass-strong surfaces.
- Desktop CSS defaults dark in `apps/desktop/src/ui/index.css`.
- Desktop light mode exists but is opt-in.
- Runtime note: the Electron app opened in the light/Warm Studio variant because the theme selector was on `mac`/system and the machine presented light mode. Mobile's current light palette is therefore not automatically wrong, but both mobile light and dark need to map cleanly to desktop tokens.

Mobile current state:

- `apps/mobile/app.json` sets `"userInterfaceStyle": "light"`.
- `MobileThemeProvider` defaults to `"system"`, but the native config biases the app toward light UI.
- Mobile light colors are warm beige/cream.
- Mobile dark colors are close to desktop, but several screens bypass `MobileTheme` and hard-code dark colors.

Broken color patterns:

- `BandsScreen.tsx`, `CommunityScreen.tsx`, `CommunityDetailScreen.tsx`, `JamRoomScreen.tsx`, and `JamStreamPlayer.tsx` contain many hard-coded `#1A1E29`, `#262B37`, `#D8A64A`, `#EEF0F5`, and rgba colors.
- These hard-coded dark colors can render incorrectly in the current light simulator state.
- Main tab screens such as Jams, Feed, Messages, Profile, and More use the light theme and look cream-heavy, while secondary screens often use dark hard-coded styles. The app will feel visually inconsistent when navigating.

Recommendation:

- Set mobile to dark-first to match desktop:
  - change `userInterfaceStyle` to `automatic` or `dark`
  - default mobile theme to `dark` or persist desktop-like system behavior intentionally
  - update splash/background colors to dark studio
- Make `MobileTheme` token names mirror desktop CSS variables:
  - `background`, `foreground`, `card`, `muted`, `mutedForeground`, `primary`, `primaryForeground`, `border`, `input`, `destructive`, `ring`
- Remove screen-level hard-coded colors except for semantic badges.
- Add a small mobile design token doc beside the desktop design system, explicitly mapping desktop `glass-solid`, `glass-strong`, list rows, action bars, pills, and hero cards to React Native styles.

## Hook And Data Parity Audit

Good:

- Mobile already copied many Convex hooks instead of inventing totally separate APIs.
- Mobile hooks exist for posts, rooms, communities, bands, my tracks, profile posts, media upload, and jam room presence.

Major gaps:

- Desktop `usePosts.ts` includes post, comments, create comment, create post, delete post, toggle like, toggle comment like, delete comment, post likes, user posts, replies, and create reply. Mobile only has `usePosts` and `useCommunityPosts`; post detail and items call Convex mutations directly.
- Desktop `useRooms.ts` includes room messages, send room message, guest heartbeat, delete room, stream URL, room status updates, performer join tokens, listener mode, and jam session refresh. Mobile has only the basic room list/get/create/update/activate/deactivate and authenticated heartbeat/disconnect.
- Desktop `useUsers.ts` owns online users, profiles, profile update/delete, conversations, messages, participants, DM creation, send/read/delete message. Mobile implements messages directly inside `MessagesScreen.tsx` and `ConversationScreen.tsx`, with no copied hook layer.
- Desktop `useFriends.ts` has dedicated friends, requests, suggestions, counts, send/accept/decline/delete/cancel hooks. Mobile has no `useFriends` hook; friend/message logic lives inside `MessagesScreen.tsx`.
- Desktop `useCommunities.ts` includes `useCommunityJamServerSettings` and `useUpdateCommunityJamServerSettings`; mobile does not.
- Desktop `useBands.ts` uses `api.bands.respondToApplication`; mobile split it into `acceptApplication` and `rejectApplication`, which may be fine if backend supports both, but it is not a direct copy.
- Desktop has `useUnifiedSearch`; mobile has no global search equivalent.
- Desktop has auth/profile stores (`authStore`, `uiStore`, `presenceStore`) and `useEnsureProfile`; mobile relies on provider/session and local state.

Recommendation:

- Create a mobile hook parity backlog and copy desktop hook shapes where React Native permits it:
  - `src/hooks/usePosts.ts`: port the full desktop action/comment/reply surface.
  - `src/hooks/useRooms.ts`: port room chat/control/listener/stream hooks.
  - `src/hooks/useFriends.ts`: direct copy from desktop with React Native-safe typing.
  - `src/hooks/useUsers.ts`: direct copy for profile, online users, conversations, and messages.
  - `src/hooks/useUnifiedSearch.ts`: add if mobile will mimic desktop search.
- Then update screens to consume those hooks instead of calling Convex directly inside components. This keeps copy-paste parity realistic without creating a shared source of truth yet.

## Screen Audit

### Auth: Login, Register, Profile Setup

Files:

- `apps/mobile/src/screens/Auth/LoginScreen.tsx`
- `apps/mobile/src/screens/Auth/RegisterScreen.tsx`
- `apps/mobile/src/screens/Auth/ProfileSetupScreen.tsx`

Findings:

- These screens are usable and theme-aware.
- They do not resemble desktop auth modality. Desktop uses `AuthModalRoot` over the app shell; mobile uses full-screen auth routes, which is reasonable for iOS.
- They use custom form layout instead of native stack headers or keyboard-aware scroll handling.
- There is no visible brand/logo treatment matching desktop sidebar assets.

Recommendations:

- Keep full-screen auth on mobile, but apply Dark Studio tokens and desktop typography.
- Wrap long forms in keyboard-aware scroll views.
- Add the desktop logo/brand mark in a restrained native layout.

### Main: Jams

File: `apps/mobile/src/screens/Jams/JamScreen.tsx`

Simulator findings:

- The current Jams screen is the strongest mobile screen.
- It has a My Room hero, search, live room count, and room cards.
- In light mode it uses a beige surface that does not match desktop Dark Studio.
- Content extends behind or too close to the tab bar.

Desktop parity gaps:

- Electron runtime confirms desktop Jams has a left sidebar, compact page header, search, grid/list toggle, Create Room, and a live-room grid.
- Desktop code also includes friends jamming and room activation/settings controls, depending on loaded data.
- Mobile hides create/edit/toggle actions unless they are inside the My Room card/list component.
- Mobile visual hierarchy is larger and card-heavy compared with desktop dense operational layout.

Recommendations:

- Keep the My Room hero, but map it to desktop `Hero Card`.
- Add native toolbar actions for create room, grid/list mode, and settings.
- Add Friends Jamming Now if backend data is available through `useFriendsInRooms`.
- Fix bottom inset so last cards never sit under the tab bar.

### Main: Feed

File: `apps/mobile/src/screens/Home/HomeScreen.tsx`

Simulator findings:

- Feed uses a simple title, composer, and vertical post list.
- It is visually clean but looks flatter and less like desktop feed.
- The tab bar overlaps the scrolling region at the bottom.

Desktop parity gaps:

- Electron runtime confirms desktop Feed has a two-column layout with Active Jams and Suggested users on the right.
- Mobile has no mobile equivalent for those sidebar modules.
- Desktop uses virtualized list behavior; mobile uses `FlatList`, which is correct, but the screen should add equivalent modules as horizontal sections or collapsible panels.
- Desktop post cards include hover/active action treatment; mobile action affordances are small text/icon rows.

Recommendations:

- Add a horizontal Active Jams rail above the feed composer or below it.
- Add Suggested Friends as a horizontal card rail if friend hooks are ported.
- Port full post action hooks and keep mutations out of `PostItem`.
- Add bottom content padding based on safe area/tab height.

### Main: Messages

File: `apps/mobile/src/screens/Messages/MessagesScreen.tsx`

Simulator findings:

- Messages is a simple segmented screen: Chats, Friends, Find.
- Rows are readable, but all logic is in the screen file.
- There is no split-detail equivalent, which is normal on phone, but the screen can better mimic desktop with stateful sections and stronger list states.

Desktop parity gaps:

- Electron runtime confirms desktop `FriendsTab` is a split messages/friends surface with left conversation/search panel and right conversation detail/empty state.
- Desktop code adds friend requests, user search, online status, and DM hooks.
- Mobile has part of this but no dedicated hooks and no online/presence treatment visible in the sampled UI.

Recommendations:

- Rename/align the section model with desktop: Conversations, Friends, Requests/Search.
- Port `useFriends` and `useUsers` message hooks.
- Add online status rings/badges to rows.
- Move query/mutation orchestration out of screen body.

### Main: Profile

Files:

- `apps/mobile/src/screens/Profile/ProfileScreen.tsx`
- `apps/mobile/src/components/profile/ProfileHeader.tsx`

Simulator findings:

- Profile is sparse: title, settings/sign out, display name, username, own posts.
- There is a large blank vertical gap between header controls and profile identity.
- It lacks desktop profile richness.

Desktop parity gaps:

- Desktop Profile has route-based profile viewing, richer profile metadata, friends/posts sections, and desktop page-header back behavior for non-self profiles.
- Mobile only shows current profile as a tab. There is no obvious route parity for viewing another user from posts/messages beyond navigation code in some components.

Recommendations:

- Use a profile hero/header card with avatar, display name, username, stats, and edit/settings actions.
- Add public profile route parity for tapped usernames.
- Use the same `useUser`, `useUserPosts`, `useFriendsCount`, and update profile hooks as desktop.

### Main: More

File: `apps/mobile/src/screens/More/MoreScreen.tsx`

Simulator findings:

- More only exposes My Music, Communities, and Bands.
- It is clean but makes three desktop primary tabs secondary.

Desktop parity gaps:

- Desktop has Communities, Bands, and My Music as first-class navigation destinations.
- More has no settings row even though Settings exists from Profile.

Recommendations:

- If "same experience" is literal, remove More and make Communities, Bands, and My Music tabs.
- If five tabs are required, make More a proper hub with Settings, theme, account, app info, and maybe recent destinations.
- Electron runtime supports the first option: Communities, Bands, and My Music are sidebar peers with Jams, Feed, and Friends, not secondary areas.

### My Music

File: `apps/mobile/src/screens/Music/MyMusicScreen.tsx`

Findings:

- Uses mobile hooks for tracks and add/delete flows.
- Electron runtime confirms desktop `MyMusicTab` has `My Library` and `Upload` tabs with a centered empty state when no tracks exist.
- Mobile should preserve that two-tab structure and desktop field/state naming where practical.
- Uses hard-coded dark styles in parts of the screen.

Recommendations:

- Port desktop `useMyTracks` shape exactly.
- Use a native document picker/upload flow but keep desktop field names and states.
- Use themed list rows, not hard-coded dark colors.

### Communities List

File: `apps/mobile/src/screens/Community/CommunityScreen.tsx`

Findings:

- Has community list, filters/search, and create flow.
- Contains many hard-coded dark colors.
- Likely close in feature intent but not in visual system.

Desktop parity gaps:

- Electron runtime confirms desktop `CommunitiesTab` uses page header, search, create action, tag pill bar, list item recipe, and route navigation.
- Mobile should mirror these as native sections with sticky filter/search.

Recommendations:

- Replace hard-coded colors with `MobileTheme`.
- Use a sticky native search/filter region.
- Port desktop `useCommunities` exactly, including joined/created count naming cleanup.

### Community Detail

File: `apps/mobile/src/screens/Community/CommunityDetailScreen.tsx`

Findings:

- This is one of the more complete mobile screens: feed/members/jam-related functionality, member management, and room form modal.
- It is also one of the highest-risk screens because it mixes many feature concerns and hard-coded styling in one large file.

Desktop parity gaps:

- Desktop `CommunityPage` uses a richer page model and likely integrates posts, members, and jam server settings.
- Mobile lacks `useCommunityJamServerSettings` and `useUpdateCommunityJamServerSettings`.

Recommendations:

- Split into subcomponents: header, tabs, feed, members, jam panel, room form, member row.
- Port missing community jam settings hooks.
- Convert modal forms to native stack modal/form-sheet style if using Expo Router.

### Bands

File: `apps/mobile/src/screens/Bands/BandsScreen.tsx`

Findings:

- Feature-rich but very large and heavily hard-coded.
- Uses modal flows, filter chips, my listings, applications, and joined bands.
- Hard-coded dark colors will clash with current light app configuration.

Desktop parity gaps:

- Electron runtime confirms desktop `BandsTab` is dense and list-based with view switcher, search, create action, role pills, and per-row Apply actions.
- Mobile hook names diverge for application response.

Recommendations:

- Split into list, filters, my listings, application rows, create modal, apply modal.
- Replace colors with theme tokens.
- Decide whether backend/application response should match desktop `respondToApplication` hook or keep accept/reject wrappers.

### Post Detail

File: `apps/mobile/src/screens/Posts/PostDetailScreen.tsx`

Findings:

- Uses direct Convex calls for post, comments, create comment, like, delete.
- Uses `SafeAreaView` from React Native, not `react-native-safe-area-context`.
- Comments/replies are present through components but hook parity is weak.

Desktop parity gaps:

- Desktop post route and modal route share post hooks and `PostCard` behavior.
- Mobile should use a full `usePost`, `useComments`, `useCreateComment`, `useToggleLike`, `useDeletePost`, `useReplies`, `useCreateReply` hook surface.

Recommendations:

- Port desktop post hooks.
- Use native stack header with title/back, not custom header-only layout.
- Add bottom inset and keyboard handling for comment composer.

### Conversation

File: `apps/mobile/src/screens/Messages/ConversationScreen.tsx`

Findings:

- Implements its own pagination, participant query, send/read/delete, and older-message loading.
- This should be copied from desktop `useUsers` hook model instead of living in the screen.

Desktop parity gaps:

- Desktop has `useMessages`, `useSendMessage`, `useMarkAsRead`, `useDeleteMessage`, and conversation participant hooks.
- Mobile misses the reusable layer and likely diverges behavior over time.

Recommendations:

- Port desktop messaging hooks.
- Use inverted `FlatList` or explicit bottom anchoring depending on current UX.
- Add keyboard avoiding view and composer safe-area padding.

### Jam Room

File: `apps/mobile/src/screens/Jams/JamRoomScreen.tsx`

Findings:

- Basic room detail with presence and stream player.
- It lacks much of the desktop jam room's performer/listener/chat/control experience.

Desktop parity gaps:

- Desktop `JamRoom` includes participant sections, room messages/chat sidebar, streaming controls/status, listener mode, session refresh, performer token, and richer room metadata.
- Mobile room hooks do not include most of those APIs.

Recommendations:

- Port the missing `useRooms` controls and `roomMessages` hooks.
- Add native tabs/segmented sections inside room: Now Playing, Chat, People, Settings.
- Keep audio player native through `expo-audio`, but align behavior and status labels with desktop.

### Settings

File: `apps/mobile/src/screens/Settings/SettingsScreen.tsx`

Findings:

- Mobile settings has theme controls and account actions.
- Desktop settings likely includes theme and censorship/app preferences through `uiStore`.
- Mobile settings is accessed from Profile, not More.

Recommendations:

- Keep Settings as stack route, but expose it from More too.
- Align settings options with desktop: theme, censorship, account, profile, app/about.
- Store mobile UI preferences in a small local store or context with explicit parity to desktop names.

## Component Audit

Post components:

- `PostItem` owns delete/like mutations directly.
- `ComposePost` owns create mutation and upload behavior.
- `AudioPostPlayer` has mobile-specific compatibility handling for iOS unsupported formats, which is good, but desktop and mobile audio UX diverge.

Jam components:

- `JamList`, `JamItem`, and `JamStreamPlayer` are the closest to desktop visual intent but still use mobile-specific cards and hard-coded colors.

Comment components:

- `CommentItem` owns like/delete/reply mutations directly.
- `CommentComposer` is reusable and theme-aware.

Recommendation:

- Keep native-only media/upload/audio code in mobile components.
- Move Convex actions into copied hooks to mimic desktop behavior.
- Create shared mobile component recipes matching desktop design-system recipes:
  - Page header
  - Section header
  - List row with left accent
  - Glass card
  - Hero card
  - Filter pill bar
  - Action bar
  - Form input
  - Number stepper

## Accessibility And Native Feel

Findings:

- Several actionable items show as generic accessibility elements rather than buttons in the simulator hierarchy.
- Icon fonts expose glyph labels such as ``, ``, and `` in accessibility labels.
- Many screens use custom headers instead of native stack headers.
- Many scroll views/lists do not use automatic content inset behavior because this is not Expo Router/native tabs.

Recommendations:

- Add `accessibilityRole`, `accessibilityLabel`, and `accessibilityHint` to pressable rows and icon-only buttons.
- Hide decorative icons from accessibility labels when appropriate.
- Prefer native stack headers/search bars after navigation migration.
- Ensure all lists have bottom padding for the tab bar and top insets.

## Recommended Implementation Order

1. Theme cleanup first.
   - Make mobile dark-first or automatic.
   - Centralize tokens in `MobileTheme`.
   - Remove hard-coded screen colors.

2. Navigation foundation.
   - Decide whether to migrate to Expo Router now.
   - If yes, implement `NativeTabs` and stack routes.
   - If no, fix current tab safe area immediately and plan Expo Router migration later.

3. Hook parity.
   - Port desktop hooks into mobile by feature area.
   - Update screens to consume hooks.
   - Keep native-specific media/audio upload details in mobile.

4. Screen-by-screen redesign.
   - Jams
   - Feed
   - Messages/Friends
   - Profile
   - Communities
   - Bands
   - My Music
   - Detail routes

5. Accessibility and final simulator pass.
   - Verify every screen in light/dark.
   - Verify tab bar and scroll insets on iPhone mini/standard/Pro Max sizes.
   - Verify keyboard flows on auth, compose, comments, chat, create/apply modals.

## Concrete Backlog

- Replace `@react-navigation/bottom-tabs` tab bar with Expo Router `NativeTabs`, or write a short interim safe-area fix.
- Change `app.json` `userInterfaceStyle` away from forced light.
- Add `src/theme/mobileTokens.ts` matching desktop CSS variables.
- Remove hard-coded colors from:
  - `BandsScreen.tsx`
  - `CommunityScreen.tsx`
  - `CommunityDetailScreen.tsx`
  - `JamRoomScreen.tsx`
  - `JamStreamPlayer.tsx`
- Expand `usePosts.tsx` to match desktop post/comment hooks.
- Add mobile `useFriends.ts`.
- Add mobile `useUsers.ts` for profiles, conversations, and messages.
- Expand `useRooms.tsx` with room chat/control/listener hooks.
- Add missing community jam settings hooks.
- Refactor `MessagesScreen.tsx` and `ConversationScreen.tsx` to use hooks.
- Refactor `BandsScreen.tsx` and `CommunityDetailScreen.tsx` into smaller components.
- Add bottom content padding/insets to every `FlatList` and `ScrollView`.
- Add proper accessibility labels/roles for icon buttons, tab-related rows, list cards, and composer actions.

## Completion Checklist For This Audit

- Read Convex project guidance: done, `convex/_generated/ai/guidelines.md`.
- Use Expo skill: done, `expo:building-native-ui`; native tabs guidance reviewed.
- Inspect mobile code: done, `apps/mobile/src`.
- Inspect desktop reference code/design: done, `apps/desktop/src/ui` and `apps/desktop/docs/DESIGN_SYSTEM.md`.
- Check Electron app: done, `jam-desktop` dev runtime at `localhost:5123`.
- Check simulator: done, iPhone 17 iOS 26.3.
- Cover every mobile screen: done in Screen Audit.
- Cover native tab complaint: done in Navigation Audit.
- Cover colors/theme complaint: done in Theme And Visual System Audit.
- Cover hook/copy-paste parity: done in Hook And Data Parity Audit.
- Create root Markdown file: done, `MOBILE_APP_AUDIT.md`.
