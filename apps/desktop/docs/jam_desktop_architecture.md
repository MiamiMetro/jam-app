# 🎵 Jam Desktop — Proje Mimari Dokümantasyonu

**Proje**: `jam-desktop` — Müzisyenler için gerçek zamanlı sosyal medya masaüstü uygulaması.
**Yazar**: MiamiMetro

---

## Genel Bakış

Jam, müzisyenlerin bir arada müzik yapmasını, paylaşmasını ve iletişim kurmasını sağlayan bir **Electron masaüstü uygulamasıdır**. Discord + SoundCloud + Twitter benzeri bir sosyal platform.

---

## Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| **Desktop Shell** | Electron 39 |
| **Frontend** | React 19 + TypeScript |
| **Router** | React Router DOM 7 (HashRouter for Electron) |
| **Styling** | TailwindCSS 4 + CVA |
| **State** | Zustand 5 |
| **Backend/DB** | Convex (serverless, real-time) |
| **Auth** | Better Auth (e-mail/şifre) |
| **Media** | Cloudflare R2 (upload/CDN) + HLS.js (streaming) |
| **Real-time Presence** | @convex-dev/presence |
| **Build** | Vite 7 + electron-builder |

---

## Proje Yapısı

```
jam-desktop/
├── src/
│   ├── electron/           # Electron ana süreç (main process)
│   │   ├── main.ts         # BrowserWindow, IPC, deep link, güvenlik, menü
│   │   ├── preload.ts      # Context bridge (renderer ↔ main güvenli iletişim)
│   │   └── util.ts         # isDev() helper
│   └── ui/                 # React renderer süreci (frontend)
│       ├── main.tsx         # Entry point, provider hiyerarşisi
│       ├── App.tsx          # Routing tanımları
│       ├── index.css        # Global stil + TailwindCSS
│       ├── pages/           # Sayfa bileşenleri (5 adet)
│       ├── components/      # UI bileşenleri (22+ dosya + 7 alt klasör)
│       ├── hooks/           # Custom hooklar (16 adet)
│       ├── stores/          # Zustand state yönetimi (4 store)
│       ├── contexts/        # React Context (2 adet)
│       ├── layouts/         # Layout bileşenleri (AppLayout, MainContent)
│       └── lib/             # Yardımcı fonksiyonlar + API yapılandırmaları
├── convex/                  # Backend (sunucusuz fonksiyonlar + şema)
│   ├── schema.ts            # Veritabanı şeması (16 tablo)
│   ├── auth.ts              # Better Auth yapılandırması
│   ├── auth.config.ts       # Auth config
│   ├── helpers.ts           # Ortak yardımcı fonksiyonlar + validasyon
│   ├── profiles.ts          # Profil CRUD
│   ├── posts.ts             # Post CRUD + beğeni
│   ├── comments.ts          # Threaded yorum sistemi
│   ├── friends.ts           # Arkadaşlık sistemi
│   ├── communities.ts       # Topluluk yönetimi
│   ├── bands.ts             # Grup ilan ve başvuru sistemi
│   ├── rooms.ts             # Jam room (canlı müzik odaları)
│   ├── messages.ts          # DM (özel mesajlaşma)
│   ├── roomMessages.ts      # Oda içi chat mesajları
│   ├── blocks.ts            # Engelleme sistemi
│   ├── users.ts             # Kullanıcı arama
│   ├── presence.ts          # Çevrimiçi durum takibi
│   ├── media.ts             # R2 medya yükleme (presigned URL)
│   ├── mediaService.ts      # Medya URL çözümleme
│   ├── mediaCleanup.ts      # Yetim medya temizliği
│   ├── mediaMaintenance.ts  # Medya bakım görevleri
│   ├── uploadSessions.ts    # Yükleme oturumu doğrulama
│   ├── rateLimiter.ts       # Rate limiting
│   ├── crons.ts             # Zamanlanmış görevler
│   ├── shared.ts            # Paylaşılan sabitler
│   └── http.ts              # HTTP route handler
└── public/                  # Statik dosyalar (logo SVG'ler)
```

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

### Sosyal Tablolar

| Tablo | Açıklama |
|-------|----------|
| [friends](file:///c:/Users/Eren/Desktop/jam-desktop/convex/friends.ts#243-250) | **Çift yönlü** arkadaşlık modeli (pending = 1 kayıt, accepted = 2 kayıt) |
| `blocks` | Kullanıcı engelleme |
| `communities` | Topluluklar (isim, handle, tema rengi, etiketler, sahip, sayaçlar) |
| `community_members` | Üyelik + roller (`owner`, `mod`, `member`) |

### Band Tabloları

| Tablo | Açıklama |
|-------|---------|
| `band_listings` | Grup ilanları (grup adı, kapasite, aranan pozisyon, bölge, tür, durum: open/closed, denormalize başvuru sayacı) |
| `band_applications` | İlan başvuruları (başvuran, enstrüman, deneyim, mesaj) |

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

## Backend Fonksiyon Kataloğu

### [profiles.ts](file:///c:/Users/Eren/Desktop/jam-desktop/convex/profiles.ts) — Profil Yönetimi
- `getMe()` — Mevcut kullanıcının profilini getir
- `getByUsername(username)` — Profili kullanıcı adıyla sorgula
- `createProfile(username, displayName, avatarUrl)` — Yeni profil oluştur
- `updateMe({username, display_name, avatar_url, banner_url, bio, instruments, genres, dm_privacy})` — Profil güncelle
- `softDeleteMe()` — Hesabı yumuşak sil (anonimleştir, username serbest bırak)
- `getProfileCatalog()` — Enstrüman ve tür listesini getir

### [posts.ts](file:///c:/Users/Eren/Desktop/jam-desktop/convex/posts.ts) — Gönderi Sistemi
- [create({text, audio_url, audio_title, audio_duration, community_id})](file:///c:/Users/Eren/Desktop/jam-desktop/convex/auth.ts#22-44) — Gönderi oluştur
- `getById(postId)` — Tek gönderi getir
- `getFeedPaginated(paginationOpts)` — Ana akış (sayfalanmış)
- `getByUsernamePaginated(username, paginationOpts)` — Kullanıcı gönderileri
- `getCommunityPostsPaginated(communityId, paginationOpts)` — Topluluk gönderileri
- `toggleLike(postId)` — Beğeni toggle
- `getLikes(postId, paginationOpts)` — Beğenenleri listele
- `remove(postId)` — Gönderi sil (soft delete)

### [comments.ts](file:///c:/Users/Eren/Desktop/jam-desktop/convex/comments.ts) — Threaded Yorum Sistemi
> **Path-tabanlı sıralama**: `"0001"`, `"0001.0001"`, `"0001.0001.0001"` formatında path ile hiyerarşik sıralama sağlanır.
- [create({postId, text, audio_url, parentId})](file:///c:/Users/Eren/Desktop/jam-desktop/convex/auth.ts#22-44) — Yorum ekle
- `getByPostPaginated(postId, paginationOpts)` — Gönderinin yorumlarını getir
- `toggleLike(commentId)` — Yorum beğeni toggle
- `remove(commentId)` — Yorum sil (soft delete)

### [friends.ts](file:///c:/Users/Eren/Desktop/jam-desktop/convex/friends.ts) — Arkadaşlık Sistemi
> **Çift yönlü model**: Kabul edilen arkadaşlıklar her iki yönde de kayıt oluşturarak O(1) sorgu sağlar.
- `sendRequest(friendId)` — Arkadaşlık isteği gönder
- `acceptRequest(userId)` — İsteği kabul et (çift yönlü kayıt oluştur)
- `remove(userId)` — Arkadaşı çıkar / isteği iptal et
- `listPaginated({userId, search, paginationOpts})` — Arkadaşları listele
- `getRequestsPaginated()` — Gelen istekleri listele
- `getSentRequestsWithDataPaginated()` — Giden istekleri listele
- `getSuggested(limit)` — Arkadaş önerileri
- `getCount(userId)` — Arkadaş sayısı

### [communities.ts](file:///c:/Users/Eren/Desktop/jam-desktop/convex/communities.ts) — Topluluk Yönetimi
- [create({name, handle, description, themeColor, tags, avatar_url, banner_url})](file:///c:/Users/Eren/Desktop/jam-desktop/convex/auth.ts#22-44) — Topluluk oluştur (maks 3)
- `update(communityId, ...)` — Topluluk ayarlarını güncelle (sadece sahip)
- `getByHandle(handle)` / `getById(communityId)` — Topluluk getir
- `listPaginated({tag, search})` — Toplulukları listele
- `getJoined()` — Katıldığım topluluklar
- `join(communityId)` / `leave(communityId)` — Katıl / ayrıl
- `promoteMod(communityId, profileId)` — Moderatör yap
- `demoteMod(communityId, profileId)` — Moderatörden çıkar
- `removeMember(communityId, profileId)` — Üyeyi çıkar

### [bands.ts](file:///c:/Users/Eren/Desktop/jam-desktop/convex/bands.ts) — Grup İlan & Başvuru Sistemi
> Müzisyenlerin grup ilanı açıp eleman araması ve başvuru yapması.
- `listPaginated({seekingRole?, region?, search?, paginationOpts})` — İlanları listele (filtreli, sayfalanmış)
- `getMyListings()` — Kendi ilanlarımı getir
- `getActiveListingCount()` — Aktif ilan sayısını getir
- `getApplications({listingId, paginationOpts})` — İlana yapılan başvuruları getir (sadece ilan sahibi)
- `getMyApplications()` — Yaptığım başvuruları getir
- `createListing({bandName, currentMembers, maxMembers, seekingRole, region, description?, genre?})` — İlan oluştur (maks 3 aktif)
- `closeListing({listingId})` — İlanı kapat
- `deleteListing({listingId})` — İlanı sil (başvurular da silinir)
- `apply({listingId, instrument, experience, message?})` — İlana başvur

### [rooms.ts](file:///c:/Users/Eren/Desktop/jam-desktop/convex/rooms.ts) — Jam Room (Canlı Müzik Odaları)
- [create({handle, name, description, genre, maxPerformers, isPrivate})](file:///c:/Users/Eren/Desktop/jam-desktop/convex/auth.ts#22-44) — Oda oluştur (kişi başı 1)
- `update(roomId, ...)` — Oda ayarlarını güncelle
- `activate(roomId)` / `deactivate(roomId)` — Odayı aç / kapat
- `deleteRoom(roomId)` — Odayı sil
- `getByHandle(handle)` — Oda getir
- `getMyRoom()` — Kendi odamı getir
- `listActivePaginated({genre, search})` — Aktif odaları listele
- `getParticipants(roomId)` — Oda katılımcılarını getir (presence tabanlı)
- `getFriendsInRooms()` — Odalardaki arkadaşlarımı bul
- `setStreamUrl(roomId, streamUrl)` — HLS stream URL ayarla
- `updateRoomStatus(roomId, status)` — Oda durumunu güncelle (idle/live)

### [messages.ts](file:///c:/Users/Eren/Desktop/jam-desktop/convex/messages.ts) — DM (Özel Mesajlaşma)
- `ensureDmWithUser(userId)` — DM konuşması oluştur/bul
- [send({conversationId, text, audio_url})](file:///c:/Users/Eren/Desktop/jam-desktop/src/electron/main.ts#466-500) — Mesaj gönder
- `getConversationsPaginated()` — Konuşma listesi (okunmamış durumu ile)
- `getByConversationPaginated(conversationId, limit, cursor)` — Mesajları getir
- `getParticipants(conversationId)` — Katılımcıları getir
- `markAsRead(conversationId)` — Okundu işaretle
- `remove(messageId)` — Mesaj sil (soft delete)

### [media.ts](file:///c:/Users/Eren/Desktop/jam-desktop/convex/media.ts) — Medya Yükleme (Cloudflare R2)
- `createPresignedUpload(kind, contentType, fileSize)` — Presigned URL oluştur
- `finalizeUpload(sessionId)` — Yüklemeyi onayla
- Desteklenen türler: `avatar`, `banner`, `audio`

### [helpers.ts](file:///c:/Users/Eren/Desktop/jam-desktop/convex/helpers.ts) — Yardımcı Fonksiyonlar
- Input doğrulama sabitleri (`MAX_LENGTHS`, `MIN_LENGTHS`)
- [validateUsername()](file:///c:/Users/Eren/Desktop/jam-desktop/convex/helpers.ts#83-126), [validateCommunityHandle()](file:///c:/Users/Eren/Desktop/jam-desktop/convex/helpers.ts#127-159), [validateRoomHandle()](file:///c:/Users/Eren/Desktop/jam-desktop/convex/helpers.ts#160-191)
- [requireAuth()](file:///c:/Users/Eren/Desktop/jam-desktop/convex/helpers.ts#274-288), [getCurrentProfile()](file:///c:/Users/Eren/Desktop/jam-desktop/convex/helpers.ts#251-273) — Kimlik doğrulama
- [isBlocked()](file:///c:/Users/Eren/Desktop/jam-desktop/convex/helpers.ts#319-347), [areFriends()](file:///c:/Users/Eren/Desktop/jam-desktop/convex/helpers.ts#348-367) — Sosyal ilişki kontrolleri
- [acquireUniqueLock()](file:///c:/Users/Eren/Desktop/jam-desktop/convex/helpers.ts#387-412), [releaseUniqueLock()](file:///c:/Users/Eren/Desktop/jam-desktop/convex/helpers.ts#425-437) — Jenerik benzersizlik sistemi
- [formatProfile()](file:///c:/Users/Eren/Desktop/jam-desktop/convex/helpers.ts#501-507), [formatPublicProfileIdentity()](file:///c:/Users/Eren/Desktop/jam-desktop/convex/helpers.ts#491-500) — API yanıt formatlama

---

## Frontend Mimari

### Provider Hiyerarşisi ([main.tsx](file:///c:/Users/Eren/Desktop/jam-desktop/src/ui/main.tsx))
```
StrictMode
  └─ QueryClientProvider (TanStack Query)
       └─ Router (HashRouter for Electron / BrowserRouter for web)
            └─ ConvexBetterAuthProvider
                 ├─ AuthSetup (oturum kontrolü + profil senkronizasyonu)
                 ├─ App (routing)
                 └─ ConvexDebugPanel (sadece dev)
```

### Sayfa Routing ([App.tsx](file:///c:/Users/Eren/Desktop/jam-desktop/src/ui/App.tsx))
| Path | Bileşen | Açıklama |
|------|---------|----------|
| `/` | [RootRedirect](file:///c:/Users/Eren/Desktop/jam-desktop/src/ui/App.tsx#20-25) | `/jams`'e yönlendir |
| `/feed` | `FeedTab` | Ana akış |
| `/jams` | `JamsTab` | Canlı jam odaları |
| `/friends` | `FriendsTab` | Arkadaş listesi |
| `/communities` | `CommunitiesTab` | Topluluk keşfi |
| `/bands` | `BandsTab` | Grup ilanları (ilan açma, başvuru, filtreleme) |
| `/community/:handle` | `CommunityPage` | Topluluk detay |
| `/profile/:username` | [Profile](file:///c:/Users/Eren/Desktop/jam-desktop/convex/helpers.ts#501-507) | Profil sayfası |
| `/settings` | `Settings` | Ayarlar |
| `/post/:id` | [Post](file:///c:/Users/Eren/Desktop/jam-desktop/convex/posts.ts#27-90) | Gönderi detay |
| `/jam/:handle` | [JamRouteSlot](file:///c:/Users/Eren/Desktop/jam-desktop/src/ui/App.tsx#26-30) | Jam odası (JamRoom ayrıca render edilir) |

### Zustand Stores (4 Adet)
| Store | Dosya | Amaç |
|-------|-------|------|
| `authStore` | [authStore.ts](file:///c:/Users/Eren/Desktop/jam-desktop/src/ui/stores/authStore.ts) | Auth durumu (oturum, kullanıcı bilgisi, giriş/çıkış) |
| `authModalStore` | [authModalStore.ts](file:///c:/Users/Eren/Desktop/jam-desktop/src/ui/stores/authModalStore.ts) | Auth modal açma/kapama |
| `uiStore` | [uiStore.ts](file:///c:/Users/Eren/Desktop/jam-desktop/src/ui/stores/uiStore.ts) | UI durumu (aktif jam room handle, tema vb.) |
| `presenceStore` | [presenceStore.ts](file:///c:/Users/Eren/Desktop/jam-desktop/src/ui/stores/presenceStore.ts) | Presence oturum durumu |

### Custom Hooks (16 Adet)
| Hook | Dosya | İşlev |
|------|-------|-------|
| `useAudioPlayer` | Ses çalma kontrolleri |
| `useAudioRecorder` | Ses kayıt (mikrofon) |
| `useHLSPlayer` | HLS stream oynatma (jam room) |
| `usePosts` | Post CRUD + pagination |
| `useFriends` | Arkadaş listesi + arama |
| `useRooms` | Oda yönetimi |
| `useCommunities` | Topluluk CRUD |
| `useBands` | Grup ilanı CRUD + başvuru |
| `useUsers` | Kullanıcı arama + profil bilgisi |
| `usePresenceHeartbeat` | Çevrimiçi durum heartbeat |
| `useConversationScroll` | Mesaj scrolling (sonsuz kaydırma) |
| `useScrollRestoration` | Sayfa scroll pozisyonu hatırlama |
| `useR2Upload` | Cloudflare R2'ye direkt dosya yükleme |
| `useConvexAuth` | Convex auth durumu senkronizasyonu |
| `useEnsureProfile` | Profil otomatik oluşturma |
| `useDeepLink` | Deep link navigasyonu (`jam://...`) |

### Context'ler (2 Adet)
| Context | Amaç |
|---------|------|
| `PlayerContext` | Global audio player referansı |
| `PostAudioContext` | Post audio oynatma durumu (hangi post çalıyor) |

---

## Electron Ana Süreç ([main.ts](file:///c:/Users/Eren/Desktop/jam-desktop/src/electron/main.ts))

### Özellikler
- **Pencere yönetimi**: macOS trafficLightPosition, Windows titleBarOverlay
- **Deep linking**: `jam://` protokolü → uygulama içi navigasyon
- **Tek instance**: `requestSingleInstanceLock()` ile çift açılma engeli
- **IPC kanalları**:
  - `open-external` — Harici linkleri tarayıcıda aç
  - `spawn-client` — Harici client executable çalıştır
  - `save-theme` — Tema tercihini diske kaydet
  - `update-title-bar-overlay` — Windows başlık çubuğu rengini güncelle
  - `presence-session-state` — Presence oturum bilgisini cache'le
- **Güvenlik**: CSP başlıkları, navigasyon kısıtlaması, webview engelleme
- **Graceful shutdown**: Kapanışta presence disconnect HTTP çağrısı (fire-and-forget, 700ms timeout)

---

## Önemli Mimari Kararlar

### 1. Denormalize Sayaçlar
Post ve yorum beğeni/yorum sayıları doğrudan post/comment dokümanında saklanır → **O(1) okuma performansı**

### 2. Unique Lock Sistemi
`unique_locks` tablosu ile username, dm_pair, post_like, room_handle gibi benzersizlik kısıtları atomik olarak yönetilir. Eşzamanlılık sorunlarını çözer.

### 3. Çift Yönlü Arkadaşlık
[friends](file:///c:/Users/Eren/Desktop/jam-desktop/convex/friends.ts#243-250) tablosunda kabul edilen arkadaşlıklar iki kayıtla saklanır → tek yönlü sorgu ile O(1) arkadaşlık kontrolü.

### 4. Path-Tabanlı Threaded Yorumlar
`"0001.0002.0003"` formatında path ile hiyerarşik yorum sıralama. `nextCommentSequence` atomik sayacı ile eşzamanlılık altında benzersiz path garantisi.

### 5. DM Conversation Merge
Yinelenen DM konuşmalarını `mergedIntoConversationId` ile tek konuşmaya birleştirme mekanizması.

### 6. Upload Session Flow
`initiated → ready → consumed → expired` yaşam döngüsü ile güvenli medya yükleme doğrulama.

### 7. Soft Delete Paterni
Post, yorum ve mesaj silmeleri soft delete (içerik temizlenip `deletedAt` kaydedilir). Silinen hesaplar anonimleştirilir.

### 8. Rate Limiting
Tüm mutation'lar `@convex-dev/rate-limiter` ile korunur (ör: dakikada 5 post, 30 like, 30 mesaj).

---

## Medya Altyapısı

```
Kullanıcı → Frontend (useR2Upload)
         → Convex (createPresignedUpload) → R2 presigned URL döner
         → Frontend doğrudan R2'ye yükler
         → Convex (finalizeUpload) → session = ready
         → Post/profil güncelleme sırasında session tüketilir (consumed)
```

- **CDN**: `media.welor.fun` üzerinden public URL çözümleme
- **Cleanup**: Cron job ile yetim medya dosyaları temizlenir

---

## Canlı Özellikler

| Özellik | Mekanizma |
|---------|-----------|
| Anlık veri güncellemesi | Convex real-time subscriptions |
| Çevrimiçi durum | `@convex-dev/presence` + heartbeat |
| Jam room streaming | HLS.js ile `.m3u8` stream |
| Oda katılımcıları | Presence room (`room:{roomId}`) |
| Arkadaşlar odalarda | `getFriendsInRooms()` presence sorgusu |
