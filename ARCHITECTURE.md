# 🎵 Jam App — Tüm Monorepo Mimari Dokümantasyonu

**Proje**: `jam-app` — Müzisyenler için gerçek zamanlı sosyal medya platformu.
**Yazar**: MiamiMetro

---

## Genel Bakış

Jam, müzisyenlerin bir arada müzik yapmasını, paylaşmasını ve iletişim kurmasını sağlayan bir platformdur. Discord + SoundCloud + Twitter benzeri bir sosyal platform. Proje bir **Monorepo** olarak tasarlanmıştır ve tüm uygulamalar ortak bir `convex` backend'ine bağlıdır.

> **Detaylı alt-mimari dokümanları:**
> - Desktop: `apps/desktop/jam_desktop_architecture.md`
> - Mobile: `apps/mobile/jam_mobile_architecture.md`

---

## Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| **Backend/DB** | Convex (serverless, real-time) |
| **Auth** | Better Auth (e-mail/şifre, `@convex-dev/better-auth`) |
| **Media** | Cloudflare R2 (upload/CDN) + HLS.js (Desktop) / Expo Audio (Mobile) |
| **Real-time Presence** | `@convex-dev/presence` |
| **Rate Limiting** | `@convex-dev/rate-limiter` (token bucket) |
| **Desktop Shell** | Electron 39 |
| **Desktop UI** | React 19 + Vite 7 + TailwindCSS 4 + Zustand 5 + Shadcn UI |
| **Desktop Router** | React Router DOM 7 (HashRouter) |
| **Mobile Shell** | Expo 55 + React Native 0.83 |
| **Mobile Router** | React Navigation 7 (Native Stack & Bottom Tabs) |
| **Shared Types** | `@jam-app/convex` (monorepo internal paket) |

---

## Proje Yapısı

```
jam-app/
├── AGENTS.md / CLAUDE.md       # AI asistanlar için Convex kuralları
├── .npmrc                      # npm workspace ayarları
├── package.json                # Root monorepo scripts + workspaces
├── apps/
│   ├── desktop/                # Electron masaüstü uygulaması
│   │   ├── src/electron/       # Main process (BrowserWindow, IPC, deep link, güvenlik)
│   │   │   ├── main.ts         # Pencere, menü, CSP, deep link, graceful shutdown
│   │   │   ├── preload.ts      # Context bridge (renderer ↔ main)
│   │   │   └── util.ts         # isDev() helper
│   │   ├── src/ui/             # Renderer process (React)
│   │   │   ├── main.tsx        # Entry: providers hiyerarşisi
│   │   │   ├── App.tsx         # Routing tanımları (11 route)
│   │   │   ├── index.css       # Global stil + TailwindCSS
│   │   │   ├── pages/          # Sayfa bileşenleri
│   │   │   ├── components/     # UI bileşenleri (22+ dosya + 7 alt klasör)
│   │   │   ├── hooks/          # Custom hooklar (16 adet)
│   │   │   ├── stores/         # Zustand store'ları (4 adet)
│   │   │   ├── contexts/       # React Context (2 adet)
│   │   │   ├── layouts/        # AppLayout, MainContent
│   │   │   └── lib/            # Yardımcı fonksiyonlar + API config
│   │   └── jam_desktop_architecture.md
│   └── mobile/                 # Expo React Native mobil uygulaması
│       ├── App.tsx             # Root: ConvexBetterAuthProvider → MobileThemeProvider → ThemedNavigation
│       ├── index.ts            # registerRootComponent
│       ├── app.json            # Expo config (scheme: "jam", permissions, plugins)
│       ├── eas.json            # EAS Build profilleri
│       ├── metro.config.js     # Monorepo watchFolders + resolver
│       ├── src/
│       │   ├── navigation/     # RootNavigator, AuthStack, MainTabs (3 dosya)
│       │   ├── screens/        # 11 kategori, 16 ekran dosyası
│       │   ├── components/     # 4 alt klasör, 10 bileşen
│       │   ├── hooks/          # 9 custom hook dosyası
│       │   ├── lib/            # auth-client.ts (Better Auth + SecureStore)
│       │   ├── theme/          # MobileTheme.tsx (Context + light/dark paletler)
│       │   └── types/          # @jam-app/convex re-export katmanı
│       └── jam_mobile_architecture.md
├── convex/                     # Ortak Backend (27 dosya)
│   ├── schema.ts               # Veritabanı şeması (16 tablo)
│   ├── auth.ts / auth.config.ts # Better Auth yapılandırması
│   ├── http.ts                 # HTTP router (auth routes, /health, /media/upload, /media/finalize)
│   ├── helpers.ts              # Ortak yardımcılar (validation, auth, lock, format)
│   ├── profiles.ts             # Profil CRUD
│   ├── posts.ts                # Gönderi CRUD + beğeni
│   ├── comments.ts             # Threaded yorum sistemi
│   ├── friends.ts              # Arkadaşlık sistemi
│   ├── blocks.ts               # Engelleme sistemi
│   ├── communities.ts          # Topluluk yönetimi
│   ├── bands.ts                # Grup ilan ve başvuru sistemi
│   ├── rooms.ts                # Jam room yönetimi
│   ├── roomMessages.ts         # Oda içi chat
│   ├── messages.ts             # DM mesajlaşma
│   ├── users.ts                # Kullanıcı arama
│   ├── presence.ts             # Çevrimiçi durum (heartbeat, disconnect)
│   ├── media.ts                # R2 presigned URL + upload/finalize HTTP handler
│   ├── mediaService.ts         # Medya URL çözümleme
│   ├── mediaCleanup.ts         # Yetim medya temizliği (cron ile çağrılır)
│   ├── mediaMaintenance.ts     # Medya bakım görevleri
│   ├── uploadSessions.ts       # Upload oturumu doğrulama
│   ├── myTracks.ts             # Kişisel müzik kütüphanesi
│   ├── rateLimiter.ts          # Rate limiting tanımları (28 kural)
│   ├── crons.ts                # Zamanlanmış görevler
│   └── shared.ts               # Paylaşılan sabitler (ROOM_GENRES)
└── packages/
    └── convex/                 # @jam-app/convex paylaşımlı paket
        └── src/
            ├── index.ts        # api, Doc, Id, ROOM_GENRES + tüm types re-export
            └── types.ts        # FunctionReturnType tabanlı inferred tipler (20+ tip)
```

---

## Paylaşılan Tip Paketi (`packages/convex/`)

`@jam-app/convex` paketi her iki uygulamanın da kullandığı tek tip kaynağıdır.

### `index.ts` — Re-export'lar
- `api` — Convex generated API referansı
- `Doc`, `Id` — Convex doküman ve ID tipleri
- `ROOM_GENRES`, `RoomGenre` — Oda tür sabitleri

### `types.ts` — Inferred Tipler (FunctionReturnType tabanlı)
| Tip | Kaynak Query |
|-----|-------------|
| `User` | `profiles.getMe` |
| `Post` | `posts.getById` |
| `PostFeedItem` | `posts.getFeedPaginated` |
| `ProfilePostItem` | `posts.getByUsernamePaginated` |
| `Comment` | `comments.getByPostPaginated` |
| `RoomFeedItem` | `rooms.listActivePaginated` |
| `RoomDetail` | `rooms.getByHandle` |
| `MyRoom` | `rooms.getMyRoom` |
| `FriendInRoomItem` | `rooms.getFriendsInRooms` |
| `RoomParticipant` | `rooms.getParticipants` |
| `Message` | `messages.getByConversationPaginated` |
| `Conversation` | `messages.getConversationsPaginated` |
| `CommunityItem` | `communities.getByHandle` |
| `CommunityListItem` | `communities.listPaginated` |
| `CommunityMemberItem` | `communities.getMembersPaginated` |
| `MyTrackItem` | `myTracks.getMyTracks` |
| `BandListingItem` | `bands.getMyListingsPaginated` |
| `BandApplicationItem` | `bands.getApplications` |
| `MyBandItem` | `bands.getMyBandsPaginated` |
| `ConvexDoc<T>` / `ConvexId<T>` | Kısıtlanmış generic tipler |

---

## Veritabanı Şeması (16 Tablo)

### Temel Tablolar
| Tablo | Açıklama |
|-------|----------|
| `profiles` | Kullanıcı profilleri (username, avatar, bio, enstrümanlar, türler, hesap durumu, DM gizliliği) |
| `posts` | Metin/ses paylaşımları (yazar, metin, ses URL, topluluk bağlantısı, denormalize sayaçlar) |
| `comments` | **Path-tabanlı** threaded yorum sistemi (ör: `"0001.0002.0003"`) |
| `post_likes` / `comment_likes` | Beğeni tabloları (ayrı tutularak cross-invalidation'dan kaçınılır) |
| `unique_locks` | Jenerik benzersizlik kilitleme (username, dm_pair, post_like vb.) |
| `upload_sessions` | Medya yükleme oturumu doğrulama (`initiated → ready → consumed → expired`) |
| `my_tracks` | Kullanıcının kişisel müzik kütüphanesi (title, audioUrl, duration, fileSize) |

### Sosyal Tablolar
| Tablo | Açıklama |
|-------|----------|
| `friends` | **Çift yönlü** arkadaşlık modeli (pending = 1 kayıt, accepted = 2 kayıt) |
| `blocks` | Kullanıcı engelleme |
| `communities` | Topluluklar (isim, handle, tema rengi, etiketler, sahip, sayaçlar) |
| `community_members` | Üyelik + roller (`owner`, `mod`, `member`) |

### Band Tabloları
| Tablo | Açıklama |
|-------|---------|
| `band_listings` | Grup ilanları (grup adı, kapasite, aranan pozisyon, bölge, tür, durum: open/closed) |
| `band_applications` | İlan başvuruları (başvuran, enstrüman, deneyim, mesaj, durum: pending/accepted/rejected) |

### Jam Room Tabloları
| Tablo | Açıklama |
|-------|----------|
| `rooms` | Canlı müzik odaları (host, handle, tür, HLS stream URL, durum: idle/live) |
| `room_messages` | Oda içi canlı sohbet (son 30 mesaj) |

### Mesajlaşma Tabloları
| Tablo | Açıklama |
|-------|----------|
| `dm_keys` | DM çiftlerini benzersiz tanımlayan anahtar tablo (`"idA:idB"`) |
| `conversations` | Konuşma meta verisi + denormalize son mesaj bilgisi |
| `conversation_participants` | Katılımcılar + okundu takibi + aktiflik durumu |
| `messages` | DM mesajları (metin + ses) |

---

## Backend Fonksiyon Kataloğu (Tüm Dosyalar)

### `profiles.ts` — Profil Yönetimi
- `getMe()`, `getByUsername(username)`, `createProfile()`, `updateMe()`, `softDeleteMe()`, `getProfileCatalog()`

### `posts.ts` — Gönderi Sistemi
- `create()`, `getById()`, `getFeedPaginated()`, `getByUsernamePaginated()`, `getCommunityPostsPaginated()`
- `toggleLike()`, `getLikes()`, `remove()` (soft delete)

### `comments.ts` — Threaded Yorum Sistemi
- `create()`, `getByPostPaginated()`, `toggleLike()`, `remove()`

### `friends.ts` — Arkadaşlık Sistemi
- `sendRequest()`, `acceptRequest()`, `remove()`
- `listPaginated()`, `getRequestsPaginated()`, `getSentRequestsWithDataPaginated()`, `getSuggested()`, `getCount()`

### `blocks.ts` — Engelleme Sistemi
- `block()`, `unblock()`, `getBlockedUsers()`

### `communities.ts` — Topluluk Yönetimi
- `create()`, `update()`, `getByHandle()`, `getById()`, `listPaginated()`, `getJoined()`, `getMemberRole()`
- `join()`, `leave()`, `getMembersPaginated()`, `searchMembersPaginated()`, `getCreatedCount()`
- `promoteMod()`, `demoteMod()`, `removeMember()`

### `bands.ts` — Grup İlan & Başvuru Sistemi
- `listPaginated()`, `getMyListingsPaginated()`, `getByUserPaginated()`, `getActiveListingCount()`
- `getApplications()`, `getMyApplicationsPaginated()`, `getMyBandsPaginated()`
- `createListing()`, `closeListing()`, `deleteListing()`, `apply()`, `acceptApplication()`, `rejectApplication()`

### `rooms.ts` — Jam Room (Canlı Müzik Odaları)
- `create()`, `update()`, `activate()`, `deactivate()`, `deleteRoom()`
- `getByHandle()`, `getMyRoom()`, `listActivePaginated()`
- `getParticipants()`, `getFriendsInRooms()`, `setStreamUrl()`, `updateRoomStatus()`

### `roomMessages.ts` — Oda İçi Chat
- `send()`, `getRecent()`

### `messages.ts` — DM (Özel Mesajlaşma)
- `ensureDmWithUser()`, `send()`, `getConversationsPaginated()`, `getByConversationPaginated()`
- `getParticipants()`, `markAsRead()`, `remove()`

### `users.ts` — Kullanıcı Arama
- `search()` — Username ile profil arama

### `myTracks.ts` — Kişisel Müzik Kütüphanesi
- `getMyTracks()`, `getMyTrackCount()`, `addTrack()`, `deleteTrack()`

### `presence.ts` — Çevrimiçi Durum
- `roomHeartbeat()`, `disconnect()` — Oda presence yönetimi

### `media.ts` — Medya Yükleme (Cloudflare R2)
- `createPresignedUpload()`, `finalizeUpload()`
- HTTP handlers: `uploadFromApp`, `finalizeUploadFromApp` (+ CORS OPTIONS)

### `mediaService.ts` / `mediaCleanup.ts` / `mediaMaintenance.ts`
- URL çözümleme, yetim medya temizliği, bakım görevleri

### `uploadSessions.ts` — Upload Oturum Doğrulama
- Session yaşam döngüsü yönetimi (`initiated → ready → consumed → expired`)

### `helpers.ts` — Yardımcı Fonksiyonlar
- Doğrulamalar: `validateUsername()`, `validateCommunityHandle()`, `validateRoomHandle()`
- Auth: `requireAuth()`, `getCurrentProfile()`
- Sosyal: `isBlocked()`, `areFriends()`
- Lock: `acquireUniqueLock()`, `releaseUniqueLock()`
- Format: `formatProfile()`, `formatPublicProfileIdentity()`

### `rateLimiter.ts` — Rate Limiting (28 Kural)
Token bucket algoritması ile tüm mutation'lar korunur:
| Kural | Limit |
|-------|-------|
| `createPost` | 5/dk, burst 2 |
| `createComment` / `replyToComment` | 10/dk, burst 3 |
| `toggleLike` | 30/dk, burst 10 |
| `sendMessage` | 30/dk, burst 5 |
| `friendRequest` | 10/dk, burst 3 |
| `uploadInit` | 1/10sn |
| `createCommunity` | 5/saat |
| `roomCreate` | 3/saat |
| `createBandListing` | 5/saat |
| `myTrackUpload` | 5/saat |
| `guestRoomHeartbeat` | 6/dk |
| ... + 17 kural daha | (detay için `rateLimiter.ts`) |

### `shared.ts` — Paylaşılan Sabitler
- `ROOM_GENRES`: LoFi, Rock, Metal, Electronic, Jazz, Hip Hop, Indie, Classical, R&B, Reggae, Ambient, House, Pop, Acoustic

### `crons.ts` — Zamanlanmış Görevler
- `daily media cleanup` (24 saat aralık): Süresi dolmuş yetim upload'ları ve consumed session satırlarını temizler

### `http.ts` — HTTP Router
| Path | Method | Handler |
|------|--------|---------|
| `/health` | GET | Sağlık kontrolü |
| `/media/upload` | POST + OPTIONS | Presigned URL oluşturma |
| `/media/finalize` | POST + OPTIONS | Upload onaylama |
| Auth routes | * | `authComponent.registerRoutes()` (CORS açık) |

---

## Desktop Frontend Mimari (`apps/desktop/src/ui/`)

### Provider Hiyerarşisi (`main.tsx`)
```
StrictMode
  └─ QueryClientProvider (TanStack Query)
       └─ Router (HashRouter for Electron)
            └─ ConvexBetterAuthProvider
                 ├─ AuthSetup (oturum kontrolü + profil senkronizasyonu)
                 ├─ App (routing)
                 └─ ConvexDebugPanel (sadece dev)
```

### Sayfa Routing (`App.tsx`)
| Path | Bileşen | Açıklama |
|------|---------|----------|
| `/` | `RootRedirect` | `/jams`'e yönlendir |
| `/feed` | `FeedTab` | Ana akış |
| `/jams` | `JamsTab` | Canlı jam odaları |
| `/friends` | `FriendsTab` | Arkadaş listesi |
| `/communities` | `CommunitiesTab` | Topluluk keşfi |
| `/bands` | `BandsTab` | Grup ilanları |
| `/community/:handle` | `CommunityPage` | Topluluk detay |
| `/profile/:username` | `Profile` | Profil sayfası |
| `/settings` | `Settings` | Ayarlar |
| `/post/:id` | `Post` | Gönderi detay |
| `/jam/:handle` | `JamRouteSlot` | Jam odası |

### Zustand Stores (4 Adet)
| Store | Amaç |
|-------|------|
| `authStore` | Auth durumu (oturum, kullanıcı bilgisi, giriş/çıkış) |
| `authModalStore` | Auth modal açma/kapama |
| `uiStore` | UI durumu (aktif jam room handle, tema vb.) |
| `presenceStore` | Presence oturum durumu |

### Contexts (2 Adet)
| Context | Amaç |
|---------|------|
| `PlayerContext` | Global audio player referansı |
| `PostAudioContext` | Hangi post'un sesi çalıyor durumu |

### Custom Hooks (16 Adet — Önemlileri)
- `useAudioPlayer`, `useAudioRecorder`, `useHLSPlayer` — Medya/Stream kontrolü
- `usePosts`, `useFriends`, `useRooms`, `useCommunities`, `useBands`, `useUsers` — CRUD hookları
- `usePresenceHeartbeat` — Çevrimiçi durum heartbeat
- `useR2Upload` — Cloudflare R2'ye direkt dosya yükleme
- `useConversationScroll` — Mesaj sonsuz kaydırma
- `useScrollRestoration` — Sayfa scroll pozisyonu hatırlama
- `useDeepLink` — Deep link navigasyonu (`jam://...`)
- `useEnsureProfile` — Profil otomatik oluşturma

---

## Electron Ana Süreç (`apps/desktop/src/electron/main.ts`)

- **Pencere yönetimi**: macOS trafficLightPosition, Windows titleBarOverlay
- **Deep linking**: `jam://` protokolü → uygulama içi navigasyon
- **Tek instance**: `requestSingleInstanceLock()` ile çift açılma engeli
- **IPC kanalları**: `open-external`, `spawn-client`, `save-theme`, `update-title-bar-overlay`, `presence-session-state`
- **Güvenlik**: CSP başlıkları, navigasyon kısıtlaması, webview engelleme
- **Graceful shutdown**: Kapanışta presence disconnect HTTP çağrısı (fire-and-forget, 700ms timeout)

---

## Mobile Frontend Mimari (`apps/mobile/src/`)

### Provider Hiyerarşisi (`App.tsx`)
```
registerRootComponent(App)
  └─ ConvexBetterAuthProvider (client + authClient)
       └─ MobileThemeProvider (sistem temasını dinler)
            └─ ThemedNavigation
                 ├─ StatusBar (tema rengine göre)
                 ├─ SystemUI.setBackgroundColorAsync()
                 └─ NavigationContainer → RootNavigator
```

### Auth Akışı (`RootNavigator.tsx`)
- `!hasSession` → `AuthStack` (Login, Register)
- `hasSession + !profile` → `ProfileSetupScreen`
- `hasSession + profile` → `MainTabs` + Full-screen stack'ler

### Bottom Tabs (`MainTabs.tsx`)
| Tab | Bileşen | Açıklama |
|-----|---------|----------|
| `Jams` | `JamScreen` | Canlı odalar (varsayılan sekme) |
| `Feed` | `HomeScreen` | Ana akış + post oluşturma |
| `Messages` | `MessagesScreen` | DM konuşma listesi |
| `Profile` | `ProfileScreen` | Kendi profil + postlar + sign out |
| `More` | `MoreScreen` | Hub: MyMusic, Communities, Bands |

### Full-Screen Stack Ekranları
`PostDetail`, `Conversation`, `JamRoom`, `MyMusic`, `Communities`, `CommunityDetail`, `Bands`, `Settings`

### Components (4 kategori, 10 dosya)
- `posts/`: PostList, PostItem, ComposePost, AudioPostPlayer
- `comments/`: CommentItem, CommentComposer
- `jams/`: JamList, JamItem, JamStreamPlayer
- `profile/`: ProfileHeader

### Custom Hooks (9 dosya)
- `useMediaUpload` — R2 Upload Session flow (expo-file-system uploadAsync)
- `useJamRoomPresence` — Oda presence heartbeat (20sn aralık)
- `useBands` (13 export), `useCommunities` (12 export), `useRooms` (6 export)
- `useMyTracks` (4 export), `usePosts` (2 export), `useProfilePosts`, `useMyProfile`

### Tema (`MobileTheme.tsx`)
- Dark: `#1A1E29` arka plan, `#D8A64A` (altın) primary
- Light: `#F3F0E8` arka plan, `#C55A18` (turuncu) primary
- `expo-secure-store` ile tema tercihi kalıcı saklanır

---

## Önemli Mimari Kararlar

### 1. Denormalize Sayaçlar
Post ve yorum beğeni/yorum sayıları doğrudan doküman içinde saklanır → **O(1) okuma**

### 2. Unique Lock Sistemi
`unique_locks` tablosu ile username, dm_pair, post_like, room_handle atomik benzersizlik. Eşzamanlılık sorunlarını çözer.

### 3. Çift Yönlü Arkadaşlık
Kabul edilen arkadaşlıklar iki kayıtla saklanır → tek yönlü sorgu ile O(1) kontrol.

### 4. Path-Tabanlı Threaded Yorumlar
`"0001.0002.0003"` formatında path ile hiyerarşik sıralama. `nextCommentSequence` atomik sayacı ile benzersiz path garantisi.

### 5. DM Conversation Merge
Yinelenen DM konuşmalarını `mergedIntoConversationId` ile tek konuşmaya birleştirme.

### 6. Upload Session Flow
`initiated → ready → consumed → expired` yaşam döngüsü ile güvenli medya yükleme. Cron job ile yetim dosyalar temizlenir.

### 7. Soft Delete Paterni
Post, yorum, mesaj → `deletedAt` ile soft delete. Silinen hesaplar anonimleştirilir.

### 8. Rate Limiting
28 ayrı kural ile tüm mutation'lar token bucket algoritmasıyla korunur (`@convex-dev/rate-limiter`).

---

## Medya Altyapısı

```
Kullanıcı → Frontend (useR2Upload / useMediaUpload)
         → Convex HTTP (/media/upload) → R2 presigned URL döner
         → Frontend doğrudan R2'ye yükler (PUT)
         → Convex HTTP (/media/finalize) → session = ready
         → Post/profil güncelleme sırasında session tüketilir (consumed)
         → Cron: 24 saatte bir yetim dosyalar ve expired session'lar temizlenir
```

---

## Canlı Özellikler

| Özellik | Mekanizma |
|---------|-----------|
| Anlık veri güncellemesi | Convex real-time subscriptions |
| Çevrimiçi durum | `@convex-dev/presence` + heartbeat |
| Jam room streaming | HLS.js (Desktop) / Expo Audio (Mobil) |
| Oda katılımcıları | Presence room (`room:{roomId}`) |
| Arkadaşlar odalarda | `getFriendsInRooms()` presence sorgusu |

---

## Ortam Değişkenleri

### Root (`.env.local`)
Convex CLI tarafından oluşturulur (`npx convex dev`).

### Desktop (`apps/desktop/.env.local`)
```
VITE_CONVEX_URL, VITE_CONVEX_SITE_URL, VITE_SITE_URL
```

### Mobile (`apps/mobile/.env.local`)
```
EXPO_PUBLIC_CONVEX_URL, EXPO_PUBLIC_CONVEX_SITE_URL, EXPO_PUBLIC_SITE_URL
```

### Convex Backend Env Vars
```
BETTER_AUTH_SECRET, SITE_URL
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_PUBLIC, MEDIA_PUBLIC_BASE_URL
```

---

## Komutlar

```bash
npm install                  # Tüm bağımlılıklar
npm run convex:dev           # Backend dev sunucusu
npm run convex:codegen       # Schema değişikliği sonrası tip güncelleme
npm run desktop:dev          # Vite + Electron
npm run mobile:dev           # Expo Metro Bundler
npm run mobile:ios           # iOS Simulator
npm run mobile:android       # Android Emulator
```
