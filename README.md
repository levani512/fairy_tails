# Fairytails

A working first implementation of a children's story library: a Payload CMS, PostgreSQL, and one Expo application for the browser and native targets. The reader includes narrated pages, word highlighting, independent animation replay, Favorites, regional access rules, and verified offline downloads.

**This is an incremental release, not a completed production launch.** See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for the original release notes and [Parental Center](docs/PARENTAL_CENTER.md) for the newer profiles, quiz statistics, and sign-in setup. Payments and production Unity subscription verification remain unfinished.

For iPhone/iPad testing on the same local network, see [Wi-Fi testing](docs/WIFI_TESTING.md). Uploading this repository to GitHub does not deploy the website; your database, uploaded media, and secrets are intentionally excluded.

## Requirements

- Node 24.22.1+ recommended by current Payload documentation; builds in this workspace also passed on Node 24.21.0.
- PNPM 11.25.0 (`corepack enable`, then `corepack prepare pnpm@11.25.0 --activate`, if Corepack is installed).
- PostgreSQL 17+ through Docker, an existing server, or the optional workspace-local runtime below.
- Demo narration is generated locally with eSpeak NG; no external credentials are required. Windows System.Speech is an optional English voice alternative (`./scripts/narrate.ps1`). See [demo asset notes](docs/DEMO_ASSETS.md).

## Local setup (PowerShell, repository root)

**This workspace is already seeded.** To resume it, run `node scripts/local-db.mjs`, `pnpm dev:cms` and `pnpm dev:web` in three terminals. The steps below are for a fresh installation. Do not apply initial migrations again to the existing development schema.

```powershell
pnpm install
node scripts/setup.mjs --embedded
node scripts/local-db.mjs
```

Keep the database terminal running. The optional embedded runtime binds **127.0.0.1:55432**, uses UTF-8, and keeps its data in `.local/postgres-utf8`. It does not install a system service. Ctrl+C stops it. Its npm wrapper is a development-only beta dependency; use managed PostgreSQL for production.

In a second terminal:

```powershell
pnpm --filter @fairytails/cms migrate
pnpm demo:assets
pnpm seed
pnpm dev:cms
```

`setup.mjs` generates a random local Payload secret and preserves existing environment files. No admin password is seeded. Open **http://localhost:3000/admin**, create the first administrator with your own email/password, then sign in. The smoke test uses and removes its own temporary admin.

In a third terminal:

```powershell
pnpm dev:web
```

Open **http://localhost:8081**. The client talks to the CMS at port 3000. Use `pnpm --filter @fairytails/media start` in another terminal for pending local audio/video processing. Only one worker should run against the local queue. Stop each development process with Ctrl+C.

### Docker alternative

Run `node scripts/setup.mjs` without `--embedded`, then `docker compose up -d`. The example database URL uses port 5432. If configuration already exists, change `apps/cms/.env` to the Docker URL yourself. Stop dependencies with `docker compose down` (the named database volume persists). Never use a development database password for a public deployment.

### Environment

CMS (`apps/cms/.env`): `DATABASE_URL`, random `PAYLOAD_SECRET`, `SERVER_URL`, `CLIENT_ORIGIN`. Optional `DEV_COUNTRY=US|ES|...` and `DEV_PREMIUM=true|false` are server-side development settings; restart the CMS after changing them. Production ignores both and is Free-only. `DEFAULT_COUNTRY` selects the deployment's trusted default region until a session/storefront resolver is integrated.

Client (`apps/client/.env`): `EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1`. For a physical device, use the development machine's LAN hostname/address and deliberately bind the CMS to that interface. These public variables must never contain secrets.

S3/R2: see `apps/cms/.env.example`. Configure a **private** bucket, permitted client origins for GET/Range, and the server's credentials. Uploads use Payload's storage adapter; authorized delivery redirects to 120-second signed URLs. Object-storage processing and CDN integration still need deployment validation. Local development requires no cloud account.

## Native development

```powershell
pnpm dev:mobile
pnpm --filter @fairytails/client android
# On a Mac with Xcode:
pnpm --filter @fairytails/client ios
```

Use a development build compatible with Expo SDK 58, not an arbitrary installed Expo Go version. Android requires a configured SDK/emulator or device; iOS requires macOS/Xcode. Native builds and actual Unity WebViews were not tested in this delivery.

## Verification

```powershell
pnpm test
pnpm typecheck
pnpm lint
pnpm build:web
pnpm --filter @fairytails/cms build
# With the seeded database and CMS running:
cd apps/cms
pnpm exec tsx src/smoke.ts
```

Production web output is `apps/client/dist`. For local testing of that output, run `pnpm demo:web`. The service worker caches the app shell; download a story explicitly before disconnecting. Its verified media is served from Blob URLs on web, including seekable video. To test the separate fixture API without a CMS, set the client API URL to `http://localhost:3001/api/v1`, rebuild, and run `pnpm demo`. **That fixture server exposes original demonstration media publicly and must not be deployed.**

## Demonstration scenarios

- Twelve records test 10-item pagination; all reuse an original five-page story in English, Spanish and Georgian with different covers/titles. They are fixtures, not twelve unique finished books. Synthetic narration is functional test audio, not publication-quality voice acting.
- “Rabbit's Little Garden” is Premium by default, Free in the US, Premium in Spain. The Spanish region excludes the twelfth story.
- Other Premium stories reject direct manifests for Free readers. Open For grown-ups, answer the gate (24), and use Test Premium / Test Free plus country/channel controls. The server issues a signed 30-minute development session; refresh resets it. Production disables this endpoint and controls.
- All three story languages include narration and timings; the five-page fixture includes animation, music, chime, transitions and completion. Story language is separate from navigation language. Some secondary UI strings still need translation.
- Save a favorite, reload, and open Favorites. Download a story, stop both web/API servers after caching the app shell, reload its route, and navigate all five pages.

## Structure

```text
apps/cms              Payload/Next admin, content API, migrations, seed/smoke scripts
apps/client           Expo Router app, shared reader, native/web storage adapters
packages/shared       Runtime schemas and domain models
packages/access       Regional visibility and entitlement decisions
packages/api-client   Typed client transport
packages/story-player Timing and cue logic
packages/asset-manager Verified downloads and prioritized preloading
workers/media         Local background FFmpeg worker, optional provider contracts
integrations/unity    Versioned bridge types and plugin-neutral C# example
scripts               Local database, demo generation, preview server
tests                 Domain, access, playback, and download tests
docs                  API and operational notes
```

See [ARCHITECTURE.md](ARCHITECTURE.md), [CONTENT_WORKFLOW.md](CONTENT_WORKFLOW.md), and [docs/API.md](docs/API.md).
