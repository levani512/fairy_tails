# Render production deployment

## Backend web service

Connect `levani512/fairy_tails`, branch `master`, runtime **Node**.
Leave **Root Directory empty** (this is a pnpm workspace).

Build Command:

```sh
corepack pnpm install --frozen-lockfile --prod=false && corepack pnpm build:cms
```

Start Command:

```sh
node scripts/start-production.mjs
```

Leave Pre-Deploy Command empty. Startup runs pending database migrations before
starting Next.js and one media worker. The supervisor stops the service if either
process fails, allowing Render to restart the pair. It listens on `0.0.0.0:$PORT`.
Use one service instance; this worker is not designed for multiple consumers.
`.node-version` pins the Node version used in local production-build verification.
Production builds use `.next-production`, separate from the local dev server.

Choose the 2 GB RAM compute option as the initial allocation, then monitor actual
memory use during uploads and video processing. Add a **persistent disk** mounted
at **`/opt/render/project/src/apps/cms/media`** before uploading files. Start with
10 GB or enough for your current uploads, originals and generated versions.
Disk-backed services have downtime during deployments and cannot scale to multiple
instances. Disk capacity and PostgreSQL are billed separately from compute.

## Environment variables

| Name                      | Value                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `NODE_ENV`                | `production`                                                                                    |
| `NEXT_TELEMETRY_DISABLED` | `1`                                                                                             |
| `DATABASE_URL`            | Internal Database URL from a Render Postgres database in the same region                        |
| `PAYLOAD_SECRET`          | Strong random secret of at least 32 characters; preserve it across deploys                      |
| `SERVER_URL`              | Actual backend HTTPS origin, e.g. `https://fairytails-api.onrender.com`, without trailing slash |
| `CLIENT_ORIGIN`           | Actual frontend HTTPS origin, e.g. `https://fairytails.onrender.com`, without trailing slash    |
| `ELEVENLABS_API_KEY`      | Existing private API key, if narration generation is needed                                     |
| `ELEVENLABS_MODEL_ID`     | `eleven_v3` (or the model you use locally)                                                      |

Render supplies `PORT`; do not replace it. Leave all `S3_*` variables unset for
this deployment. The current media worker only supports local disk storage.
Never put server secrets in `EXPO_PUBLIC_*` variables or GitHub source files.
Google and Apple credentials are optional until their sign-in setup is complete.

## Frontend static site

Create a Render Static Site from the same repo and branch, with Root Directory empty.

Build Command:

```sh
corepack pnpm install --frozen-lockfile --prod=false && corepack pnpm build:web
```

Publish Directory: `apps/client/dist`.
Set `EXPO_PUBLIC_API_URL` to the backend origin plus `/api/v1` **before building**.
Add a rewrite from `/*` to `/index.html` for Expo Router deep links.
Use the frontend's assigned URL as the backend's `CLIENT_ORIGIN` and redeploy the
backend if it changes. Changes to frontend environment variables require a rebuild.

For parent sign-in, use frontend and API subdomains of your own domain and configure
the provider callbacks. Separate hosting-provider domains may be treated as cross-site
by Safari, which can block parent session cookies. Anonymous story playback can be
tested on the provided Render URLs first.

## Existing content and launch checks

A new database starts empty: GitHub does not contain your stories, accounts or uploads.
Plan the local database and media migration before entering production content.
Import a consistent database backup and the matching entire `apps/cms/media` directory,
including originals, then reconcile Payload's migration history. The local database
uses development schema pushes; do not blindly run initial migrations on a restored
development database whose tables already exist. Do not run seed against live content.
Create/restore the intended administrator before sharing the service publicly.

Verify login, lobby API requests, video range playback, manual audio uploads,
worker processing, ElevenLabs, quizzes and profiles on a physical iPhone and iPad.
Restart/redeploy the backend and confirm uploaded files survive. Configure database
and media backups before launch. Keep the computer's local data until the migration
and public deployment are verified.

References: [Render disks](https://render.com/docs/disks),
[Render deploys](https://render.com/docs/deploys),
[Payload migrations](https://payloadcms.com/docs/database/migrations).
