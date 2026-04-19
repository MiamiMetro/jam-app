# jam-app

Monorepo for:

- `apps/desktop`
- `apps/mobile`
- shared Convex backend in `convex/`

`convex/` is the single backend source of truth and comes from `jam-desktop`.
`apps/mobile` does not have its own backend copy anymore.

## Structure

```text
jam-app/
├─ apps/
│  ├─ desktop/
│  └─ mobile/
├─ convex/
└─ packages/
   └─ convex/
```

## Install

```bash
npm install
```

## Root Commands

```bash
npm run desktop:dev
npm run desktop:build
npm run desktop:dist:win
npm run desktop:dist:mac
npm run desktop:dist:linux

npm run mobile:dev
npm run mobile:android
npm run mobile:ios
npm run mobile:web

npm run convex:dev
npm run convex:codegen
```

You can also keep using the app-native commands:

Desktop:

```bash
cd apps/desktop
npm run dev
```

Mobile:

```bash
cd apps/mobile
npx expo start
npx expo run:android
npx expo run:ios
```

## Env Files

There are two app env files, plus the root Convex CLI env file.

### 1. Root Convex env file

Path:

```text
.env.local
```

This belongs to the Convex project at the repo root.

Create/update it by running:

```bash
npx convex dev
```

That file is for Convex CLI / deployment config. It is not the same thing as the app runtime env files below.

### 2. Desktop env file

Path:

```text
apps/desktop/.env.local
```

Desktop reads:

```env
VITE_CONVEX_URL="https://your-deployment.convex.cloud"
VITE_CONVEX_SITE_URL="https://your-deployment.convex.site"
VITE_SITE_URL="http://localhost:5123"
```

`VITE_SITE_URL` should match the desktop dev server URL.

### 3. Mobile env file

Path:

```text
apps/mobile/.env.local
```

Mobile reads:

```env
EXPO_PUBLIC_CONVEX_URL="https://your-deployment.convex.cloud"
EXPO_PUBLIC_CONVEX_SITE_URL="https://your-deployment.convex.site"
EXPO_PUBLIC_SITE_URL="http://localhost:5123"
```

Desktop and mobile should point at the same Convex deployment.

## Convex Backend Setup

Run from repo root:

```bash
npx convex dev
```

Desktop already relied on these backend env vars, and they still apply because the backend now lives at the root:

```bash
npx convex env set BETTER_AUTH_SECRET "<generate-a-32-byte-secret>"
npx convex env set SITE_URL "http://localhost:5123"
```

For Cloudflare R2 public media:

```bash
npx convex env set R2_ACCOUNT_ID "<your-cloudflare-account-id>"
npx convex env set R2_ACCESS_KEY_ID "<your-r2-access-key-id>"
npx convex env set R2_SECRET_ACCESS_KEY "<your-r2-secret-access-key>"
npx convex env set R2_BUCKET_PUBLIC "jam-media-public"
npx convex env set MEDIA_PUBLIC_BASE_URL "https://media.yourdomain.com"
```

If you change the Convex backend or deployment, regenerate bindings from the repo root:

```bash
npm run convex:codegen
```

## Shared Convex Types

Both apps consume shared Convex-derived types through:

```text
packages/convex/
```

The important files are:

- `packages/convex/src/index.ts`
- `packages/convex/src/types.ts`

That package re-exports:

- `api`
- `Doc`
- `Id`
- shared constants like `ROOM_GENRES`
- app-facing inferred types derived from Convex query return types

Desktop keeps its local type entrypoint at:

```text
apps/desktop/src/ui/lib/api/types.ts
```

Mobile keeps its local type entrypoint at:

```text
apps/mobile/src/types/index.ts
```

Both are now thin re-export layers over `@jam-app/convex`.
