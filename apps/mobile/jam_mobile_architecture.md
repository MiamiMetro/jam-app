# 📱 Jam Mobile — Proje Mimari Dokümantasyonu

**Proje**: `jam-mobile` — Müzisyenler için gerçek zamanlı sosyal medya mobil uygulaması.
**Yazar**: MiamiMetro

---

## Genel Bakış

Jam Mobile, Jam platformunun mobil versiyonudur. **Expo 55 ve React Native 0.83** kullanılarak geliştirilmiş olup, masaüstü ile tamamen aynı **Convex** backend altyapısını tüketir. iOS, Android ve Web platformlarında çalışabilir.

---

## Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| **Mobile Shell/Framework** | Expo 55 + React Native 0.83.4 |
| **Routing / Navigation** | React Navigation 7 (Native Stack + Bottom Tabs) |
| **Backend/DB** | Convex (`convex` 1.35.1) |
| **Auth** | Better Auth (`@better-auth/expo` 1.5.3, `expo-secure-store`) |
| **Real-time Presence** | `@convex-dev/presence` 0.3.0 |
| **Media / File Upload** | `expo-file-system` (legacy uploadAsync), `expo-document-picker` |
| **Audio / Playback** | `expo-audio` |
| **Styling** | Özel Tema Motoru (`MobileThemeContext`) + React Native StyleSheet |
| **Icons** | `@expo/vector-icons` (Ionicons) |
| **Shared Types** | `@jam-app/convex` (monorepo paylaşımlı paket) |

---

## Proje Yapısı

```
jam-mobile/
├── App.tsx                    # Root Entry: ConvexBetterAuthProvider → MobileThemeProvider → ThemedNavigation
├── index.ts                   # Expo registerRootComponent (AppRegistry)
├── app.json                   # Expo config (scheme: "jam", permissions, plugins, EAS)
├── eas.json                   # EAS Build profilleri (development, preview, production)
├── metro.config.js            # Monorepo için watchFolders ve resolver ayarları
├── tsconfig.json              # Path alias: @/* → ./src/*
├── assets/                    # Uygulama ikonları ve splash screen görselleri
│   ├── icon.png               # iOS App Icon
│   ├── splash-icon.png        # Splash Screen
│   ├── favicon.png            # Web favicon
│   ├── android-icon-foreground.png
│   ├── android-icon-background.png
│   └── android-icon-monochrome.png
├── tools/
│   └── generate_color_palette.py  # Kaynak koddan renkleri çıkarıp SVG palet oluşturan yardımcı script
├── src/
│   ├── navigation/            # Navigasyon hiyerarşisi (3 dosya)
│   │   ├── RootNavigator.tsx    # Session/Auth state listener → Stack ekranları
│   │   ├── AuthStack.tsx        # Login + Register ekranları
│   │   └── MainTabs.tsx         # Bottom Tab Navigator (5 sekme)
│   ├── screens/               # Ekran bileşenleri (11 kategori, 16 dosya)
│   │   ├── Auth/              # LoginScreen, RegisterScreen, ProfileSetupScreen
│   │   ├── Bands/             # BandsScreen
│   │   ├── Community/         # CommunityScreen, CommunityDetailScreen
│   │   ├── Home/              # HomeScreen
│   │   ├── Jams/              # JamScreen, JamRoomScreen
│   │   ├── Messages/          # MessagesScreen, ConversationScreen
│   │   ├── More/              # MoreScreen (hub: MyMusic, Communities, Bands)
│   │   ├── Music/             # MyMusicScreen
│   │   ├── Posts/             # PostDetailScreen
│   │   ├── Profile/           # ProfileScreen
│   │   └── Settings/          # SettingsScreen
│   ├── components/            # Tekrar kullanılabilir UI bileşenleri (4 alt klasör, 10 dosya)
│   │   ├── comments/          # CommentComposer, CommentItem
│   │   ├── jams/              # JamItem, JamList, JamStreamPlayer
│   │   ├── posts/             # AudioPostPlayer, ComposePost, PostItem, PostList
│   │   └── profile/           # ProfileHeader
│   ├── hooks/                 # Custom hooklar (9 dosya)
│   │   ├── useBands.tsx         # Band ilan ve başvuru CRUD (8 export)
│   │   ├── useCommunities.tsx   # Topluluk CRUD + moderasyon (12 export)
│   │   ├── useJamRoomPresence.ts # Oda presence heartbeat yönetimi
│   │   ├── useMediaUpload.ts    # R2 Upload Session state-machine
│   │   ├── useMyProfile.tsx     # Mevcut kullanıcı profili
│   │   ├── useMyTracks.tsx      # Müzik kütüphanesi CRUD (4 export)
│   │   ├── usePosts.tsx         # Feed + topluluk postları (2 export)
│   │   ├── useProfilePosts.tsx  # Kullanıcıya ait postlar
│   │   └── useRooms.tsx         # Oda listesi, detay, presence mutation (6 export)
│   ├── lib/
│   │   └── auth-client.ts     # Better Auth Expo adaptasyonu (SecureStore + convexClient)
│   ├── theme/
│   │   └── MobileTheme.tsx    # MobileThemeProvider + useMobileTheme hook + renk paletleri
│   └── types/
│       └── index.ts           # @jam-app/convex'ten re-export edilen tüm tipler
└── package.json
```

---

## Yapılandırma Dosyaları

### `app.json` — Expo Konfigürasyonu
- **Scheme**: `jam` (deep linking için)
- **Orientation**: Portrait-only
- **iOS**: `supportsTablet: true`, bundle ID: `com.anonymous.jam-mobile`
- **Android**: Package: `com.bokav.jammobile`, predictiveBackGesture kapalı
- **Android İzinleri**: `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`
- **Expo Plugins**: `expo-secure-store`, `expo-web-browser`, `expo-audio`
- **EAS Project ID**: `f203968b-3bdd-4fd9-9456-f7776e3b273c`

### `eas.json` — EAS Build Profilleri
| Profil | Açıklama |
|--------|----------|
| `development` | Dev client, internal dağıtım |
| `preview` | Internal dağıtım (test) |
| `production` | Auto-increment version |

### `metro.config.js` — Monorepo Metro Bundler Ayarları
- `watchFolders`: Monorepo root'u izler (`../../`)
- `nodeModulesPaths`: Hem lokal hem root `node_modules` çözümler
- `disableHierarchicalLookup`: Monorepo'da doğru paket çözümlemesi için zorunlu

### `tsconfig.json` — Path Alias
- `@/*` → `./src/*` (tüm import'larda `@/hooks/usePosts` şeklinde kullanılır)

---

## Provider Hiyerarşisi (`App.tsx`)

```
registerRootComponent(App)                    ← index.ts
  └─ App
       └─ ConvexBetterAuthProvider             ← Convex client + Better Auth
            └─ MobileThemeProvider             ← Sistem temasını dinleyen Context
                 └─ ThemedNavigation           ← NavigationContainer + StatusBar
                      ├─ StatusBar             ← Tema rengine göre stil (light/dark)
                      ├─ SystemUI.setBackgroundColorAsync()  ← Native arka plan rengi
                      └─ RootNavigator         ← Session state'e göre Stack yönetimi
```

**Önemli detaylar:**
- `ConvexReactClient`, `expectAuth: true` ve `unsavedChangesWarning: false` ile oluşturulur.
- `App.tsx` içinde `setAudioModeAsync()` çağrılır: sessiz modda çalma (`playsInSilentMode: true`), arka planda çalma kapalı, diğer seslerle karışım (`mixWithOthers`) modu.
- `ThemedNavigation` bileşeni, `MobileTheme`'den alınan renkleri React Navigation'ın `theme` nesnesine map'ler ve `expo-system-ui` ile native arka plan rengini senkronize eder.

---

## Navigasyon ve Ekran Yönetimi

### Auth Akışı (`RootNavigator.tsx`)
```
RootNavigator
  ├─ [!hasSession]     → AuthStack (Login, Register)
  ├─ [hasSession + !profile] → ProfileSetupScreen
  └─ [hasSession + profile]  → MainTabs + Full-screen stack ekranları
```

Auth kontrolü şu sırayla yapılır:
1. `authClient.useSession()` → Better Auth session kontrolü
2. `useConvexAuth()` → Convex auth token senkronizasyonu
3. `useQuery(api.profiles.getMe)` → Profil var mı kontrolü

Üçü de tamamlanana kadar `AuthLoadingScreen` (ActivityIndicator) gösterilir.

### Auth Stack (`AuthStack.tsx`)
| Ekran | Bileşen | Açıklama |
|-------|---------|----------|
| `Login` | `LoginScreen` | E-mail/şifre giriş formu |
| `Register` | `RegisterScreen` | Yeni hesap oluşturma |

### Bottom Tabs (`MainTabs.tsx`)
| Tab | Bileşen | İkon (focused / idle) | Açıklama |
|-----|---------|----------------------|----------|
| `Jams` | `JamScreen` | `musical-notes` / `musical-notes-outline` | Canlı jam odaları (varsayılan sekme) |
| `Feed` | `HomeScreen` | `radio` / `radio-outline` | Ana akış + post oluşturma |
| `Messages` | `MessagesScreen` | `chatbubble-ellipses` / `chatbubble-ellipses-outline` | DM konuşma listesi |
| `Profile` | `ProfileScreen` | `person` / `person-outline` | Kendi profil + postlar |
| `More` | `MoreScreen` | `ellipsis-horizontal-circle` / `...outline` | Hub menüsü |

- `initialRouteName`: **Jams** (uygulama açılışta Jams sekmesinde başlar)
- Tab bar yüksekliği: 66px, aktif ikon `accentMuted` arka planlı pill içinde gösterilir

### Full-Screen Stack Ekranları (Root Stack)
| Ekran | Bileşen | Parametre | Açıklama |
|-------|---------|-----------|----------|
| `PostDetail` | `PostDetailScreen` | `{ postId: string }` | Gönderi detay + yorumlar |
| `Conversation` | `ConversationScreen` | `{ conversationId, title? }` | DM sohbet arayüzü |
| `JamRoom` | `JamRoomScreen` | `{ handle: string }` | Oda içi jam, stream dinleme, sohbet |
| `MyMusic` | `MyMusicScreen` | — | Müzik kütüphanesi (yükleme/silme) |
| `Communities` | `CommunityScreen` | — | Topluluklar keşif/arama |
| `CommunityDetail` | `CommunityDetailScreen` | `{ handle: string }` | Topluluk detay + postlar + üyeler |
| `Bands` | `BandsScreen` | — | Grup ilanları, başvurular, filtreleme |
| `Settings` | `SettingsScreen` | — | Tema değiştirme (System/Light/Dark) |

---

## Ekran Detayları

### `HomeScreen` — Ana Akış
- `usePosts()` ile `getFeedPaginated` sorgusu → sonsuz kaydırma
- `useMyProfile()` ile profil bilgisi
- `ComposePost` bileşeni header'da; `PostList` ile feed render
- Infinite scroll: `onEndReached` → `loadMore(10)`

### `JamScreen` — Canlı Odalar Listesi
- `useRooms(search)` → aktif odalar (arama destekli)
- `useMyRoom()` → kendi odam var mı
- `useFriendsInRooms()` → arkadaşlarım hangi odalarda
- `JamList` bileşeni: arama çubuğu + oda kartları + arkadaş odalarda badge

### `ProfileScreen` — Kendi Profilim
- `useMyProfile()` + `useProfilePosts(username)`
- `ProfileHeader` bileşeni: avatar, bio, Settings navigasyonu, Sign Out butonu
- `PostList` ile kendi postlarını sonsuz kaydırma

### `MoreScreen` — Hub Menüsü
- Tam ekran navigasyonlara köprü: **My Music**, **Communities**, **Bands**
- Her menü öğesi ikon + başlık + açıklama kartı
- `navigation.getParent()` ile root stack'e navigasyon yapar

### `MessagesScreen` — DM Listesi
- Konuşma listesi, okunmamış göstergesi
- Konuşma kartına tıklayınca `ConversationScreen`'e navigasyon

### `ConversationScreen` — DM Sohbet
- Mesaj geçmişi + gerçek zamanlı güncelleme
- Metin ve ses mesajı gönderme

### `BandsScreen` — Grup İlanları
- 48KB'lık kapsamlı ekran: İlan listesi, filtreleme (rol, bölge, arama), ilan oluşturma, başvuru yapma, başvuru kabul/red
- Tüm CRUD operasyonları `useBands` hook ailesi üzerinden

### `CommunityScreen` / `CommunityDetailScreen` — Topluluklar
- Topluluk keşfi ve arama + Topluluk oluşturma
- Detay: Topluluk postları, üye listesi, moderasyon (promote/demote/remove)

### `MyMusicScreen` — Müzik Kütüphanesi
- Şarkı yükleme (`useMediaUpload` + `useAddTrack`)
- Mevcut şarkıları listeleme ve silme (`useMyTracks`, `useDeleteTrack`)

### `SettingsScreen` — Tema Ayarları
- 3 tema seçeneği: **System** (cihaz), **Light**, **Dark**
- `useMobileTheme().setTheme()` ile anında değiştirme
- Seçim `expo-secure-store` ile kalıcı olarak saklanır

---

## Custom Hooks Kataloğu

### `useBands.tsx` — Grup İlan & Başvuru Sistemi (8 export)
| Hook | İşlev |
|------|-------|
| `useBandListings(filters?)` | İlanları filtreli sayfalanmış listele |
| `useMyBandListings()` | Kendi ilanlarımı listele |
| `useActiveListingCount()` | Aktif ilan sayısı |
| `useBandApplications(listingId)` | İlana yapılan başvurular |
| `useMyBandApplications()` | Yaptığım başvurular |
| `useMyBands()` | Kendi bandlerimi listele |
| `useUserBandListings(userId)` | Belirli kullanıcının ilanları |
| `useCreateBandListing()` | Yeni ilan oluştur |
| `useCloseBandListing()` | İlanı kapat |
| `useDeleteBandListing()` | İlanı sil |
| `useApplyToBand()` | İlana başvur |
| `useAcceptBandApplication()` | Başvuruyu kabul et |
| `useRejectBandApplication()` | Başvuruyu reddet |

### `useCommunities.tsx` — Topluluk Yönetimi (12 export)
| Hook | İşlev |
|------|-------|
| `useCommunities(filters?)` | Toplulukları filtreli sayfalanmış listele |
| `useCommunity(handle)` | Handle ile topluluk getir |
| `useCommunityById(id)` | ID ile topluluk getir |
| `useJoinedCommunities()` | Katıldığım topluluklar |
| `useMemberRole(communityId)` | Üyelik rolümü getir |
| `useCommunityMembers(communityId)` | Üye listesi (sayfalanmış) |
| `useSearchCommunityMembers(communityId, username)` | Üye arama (min 2 karakter) |
| `useCommunityCreatedCount()` | Oluşturduğum topluluk sayısı |
| `useCreateCommunity()` | Topluluk oluştur |
| `useUpdateCommunity()` | Topluluk güncelle |
| `useJoinCommunity()` / `useLeaveCommunity()` | Katıl / Ayrıl |
| `usePromoteMod()` / `useDemoteMod()` / `useRemoveMember()` | Moderasyon işlemleri |

### `useRooms.tsx` — Jam Room Yönetimi (6 export)
| Hook | İşlev |
|------|-------|
| `useRooms(search?)` | Aktif odaları sayfalanmış listele |
| `useRoom(handle)` | Handle ile oda getir |
| `useMyRoom()` | Kendi odamı getir |
| `useFriendsInRooms()` | Odalardaki arkadaşlarımı bul |
| `useRoomParticipants(roomId)` | Oda katılımcıları + toplam sayı |
| `useRoomHeartbeat()` / `useDisconnectPresence()` | Presence mutation'ları |

### `useJamRoomPresence.ts` — Oda Presence Yönetimi
- `HEARTBEAT_INTERVAL_MS`: 20 saniye
- Her 20 saniyede `roomHeartbeat` mutation'ı çağırılır
- `sessionToken` ref'te saklanır; cleanup'ta `disconnect` gönderilir
- Hata mesajları: `ROOM_INACTIVE`, `PRIVATE_ROOM`, `ROOM_NOT_FOUND`

### `useMediaUpload.ts` — Cloudflare R2 Medya Yükleme
Upload flow'u:
1. Auth token al (`authClient.convex.token()`)
2. Backend'den presigned URL iste (`/media/upload` POST)
3. `expo-file-system/legacy` → `uploadAsync()` ile R2'ye binary upload
4. Backend'e finalize bildir (`/media/finalize` POST)
5. `{ url, key, contentType, fileSize }` döner

`guessContentType()`: Dosya uzantısına göre MIME type tahmin eder (mp3, m4a, wav, ogg, webm vb.)

### `useMyTracks.tsx` — Müzik Kütüphanesi (4 export)
| Hook | İşlev |
|------|-------|
| `useMyTracks()` | Tüm şarkılarımı sayfalanmış listele |
| `useMyTrackCount()` | Toplam şarkı sayısı |
| `useAddTrack()` | Yeni şarkı ekle (audioUrl, duration, fileSize, contentType, title) |
| `useDeleteTrack()` | Şarkı sil |

### `usePosts.tsx` — Gönderi Sorguları (2 export)
| Hook | İşlev |
|------|-------|
| `usePosts()` | Ana feed akışı (sayfalanmış) |
| `useCommunityPosts(communityId)` | Topluluk postları |

### `useProfilePosts.tsx` — Profil Postları
- `useProfilePosts(username)` → Kullanıcıya ait postları sayfalanmış getir

### `useMyProfile.tsx` — Mevcut Kullanıcı Profili
- `useMyProfile()` → `api.profiles.getMe` sorgusu

---

## Bileşen (Component) Kataloğu

### `components/posts/` — Gönderi Bileşenleri (4 dosya)
| Bileşen | Açıklama |
|---------|----------|
| `PostList` | FlatList tabanlı sonsuz kaydırmalı post listesi |
| `PostItem` | Tek bir post kartı (yazar, metin, beğeni, yorum sayısı) |
| `ComposePost` | Yeni post oluşturma formu (metin + ses yükleme) |
| `AudioPostPlayer` | Post'a eklenmiş ses dosyasını oynatma kontrolcüsü |

### `components/comments/` — Yorum Bileşenleri (2 dosya)
| Bileşen | Açıklama |
|---------|----------|
| `CommentItem` | Tek bir yorum kartı (yazar, metin, beğeni, yanıtla) |
| `CommentComposer` | Yorum yazma/yanıtlama formu |

### `components/jams/` — Jam Room Bileşenleri (3 dosya)
| Bileşen | Açıklama |
|---------|----------|
| `JamList` | Oda listesi (arama çubuğu, kendi odam kartı, arkadaşlar badge'i, sonsuz kaydırma) |
| `JamItem` | Tek bir oda kartı (host, tür, katılımcı sayısı, live/idle durumu) |
| `JamStreamPlayer` | HLS/Audio stream oynatma kontrolcüsü (expo-audio tabanlı) |

### `components/profile/` — Profil Bileşenleri (1 dosya)
| Bileşen | Açıklama |
|---------|----------|
| `ProfileHeader` | Avatar, banner, kullanıcı adı, bio, Settings/SignOut butonları |

---

## Authentication Altyapısı (`lib/auth-client.ts`)

Better Auth, React Native'de tarayıcı çerezleri çalışmadığı için özel eklentiler kullanır:
- **Mobil** (`Platform.OS !== "web"`): `expoClient()` eklentisi → `expo-secure-store` ile token saklanır (iOS Keychain / Android Keystore)
- **Web** (`Platform.OS === "web"`): `crossDomainClient()` eklentisi → standart cookie tabanlı auth
- **App Scheme**: `jam` (deep link callback'ler için)
- **Base URL**: `EXPO_PUBLIC_CONVEX_SITE_URL` ortam değişkeni

---

## Tema Motoru (`theme/MobileTheme.tsx`)

### Yapı
- `MobileThemeProvider` → React Context + `useColorScheme()` (sistem teması)
- `useMobileTheme()` → `{ colors, resolvedTheme, theme, setTheme }` döner
- Seçilen tema `expo-secure-store` ile kalıcı saklanır

### Renk Paletleri (17 token)
| Token | Dark | Light |
|-------|------|-------|
| `background` | `#1A1E29` | `#F3F0E8` |
| `card` | `#262B37` | `#FBFAF6` |
| `cardPressed` | `#2C3240` | `#EFE8DA` |
| `primary` | `#D8A64A` (altın) | `#C55A18` (turuncu) |
| `primaryForeground` | `#251B0A` | `#FFF8ED` |
| `foreground` | `#EEF0F5` | `#332A20` |
| `mutedForeground` | `#8F98A8` | `#766B5F` |
| `border` | `rgba(255,255,255,0.08)` | `#D9D0C0` |
| `accent` | `#D8A64A` | `#C55A18` |
| `destructive` | `#FECACA` | `#B42318` |
| `success` | `#8BE0AD` | `#248A4C` |

---

## Tip Yönetimi (`types/index.ts`)

Tüm tipler `@jam-app/convex` paketinden re-export edilir:
`BandApplicationItem`, `BandListingItem`, `Comment`, `CommunityItem`, `CommunityListItem`, `CommunityMemberItem`, `Conversation`, `ConvexDoc`, `ConvexId`, `Doc`, `FriendInRoomItem`, `Id`, `Message`, `MyBandItem`, `MyRoom`, `MyTrackItem`, `Post`, `PostFeedItem`, `ProfilePostItem`, `RoomDetail`, `RoomFeedItem`, `RoomParticipant`, `User`

---

## Mutation Hook Paterni

Tüm mutation hook'ları aynı tasarım paternini kullanır:
```typescript
export function useXxxMutation() {
  const mutation = useMutation(api.xxx.yyy);
  const [isPending, setIsPending] = useState(false);

  const run = async (variables) => {
    setIsPending(true);
    try { return await mutation(variables); }
    finally { setIsPending(false); }
  };

  return {
    isPending,
    mutate: (vars, options?) => run(vars).then(onSuccess).catch(onError),
    mutateAsync: run,
  };
}
```
Bu patern, React Query benzeri bir `{ isPending, mutate, mutateAsync }` API'si sunar. Tüm Convex ID dönüşümleri (`as Id<"table">`) hook içinde yapılır, ekranlar sadece `string` gönderir.

---

## Araçlar (`tools/`)

### `generate_color_palette.py`
- `src/` ve `app.json` içindeki tüm HEX ve RGBA renkleri tarar
- Luminance hesabıyla Light/Dark olarak gruplar
- `artifacts/colors/light-dark-palette.svg` dosyasına görsel palet çıktısı oluşturur
