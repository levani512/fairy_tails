# Implementation status

## ElevenLabs narration workflow

Default and additional page languages now have a saved voice selection, Generate voice, temporary playback preview, Use this audio, manual upload/select, and Sync audio with text. Server-only authenticated endpoints list voices, generate MP3 previews and force-align ready media. Alignment validates exact UTF-16 offsets, transcript coverage and audio bounds; stale generated/sync results are rejected. Missing API configuration is shown in the editor. The workspace has no ElevenLabs key, so live provider generation/alignment is not yet verified. Mock-provider tests cover pagination, binary previews, uploaded-media alignment, Unicode/repeated words, access control and errors. All 46 unit tests, typecheck, migrations and draft-save checks passed.

## Default page narration

Each page exposes default-language narration text and audio directly, with Additional narration languages for optional translations. The default follows the story Language. Legacy audio, timings and localized visual references are retained. Browser checks, 39 unit tests, typecheck, local HTTP saves, existing published story validation and fresh-database migrations passed.

## Default story language

The main story form contains Language, Title, Description, Cover and Thumbnail. Additional languages repeat those fields through Add Language. Legacy default translations are lifted into the main fields without losing additional translations. Browser verification, 37 unit tests, typecheck, lint, CMS production build, fresh-database migrations and the real HTTP save regression check passed.

## Story save error fix

Publication validation now returns a readable HTTP 400 field error instead of an unexpected HTTP 500. Incomplete content may be saved as Draft; publishing still requires complete content. A real HTTP regression check (`apps/cms/src/save-smoke.ts`) verified creation of an incomplete draft, readable rejection of publishing, and preservation of the saved draft. The administrator dashboard import map also includes the missing CollectionCards component.

## Simplified page illustrations

Page Illustration accepts either an image or MP4, detected automatically. Fit, Layout and page Poster controls are hidden. The story cover supplies the shared video poster/fallback. Existing separate video records are presented in the unified selector without deleting their source files; selecting a replacement image can remove the animation. Localized overrides also accept either image or video. Two regression tests cover detection/fallback and legacy selector behavior; 35 tests pass.

## Compact story editor

Music uses a single desktop row, with Duck renamed Lower music during narration and Fade Duration displayed/edited in seconds. The stored millisecond value remains compatible with existing media and player code. Related metadata, uploads, page settings and translations share rows with responsive wrapping. Browser checks verified the 0.4-second default and editing to 1.5 seconds.

## Story thumbnails

Stories have a separate Thumbnail upload with the same create/select/drag-and-drop controls as Cover, plus optional language overrides. Cards use thumbnails, details keep covers, and empty thumbnails fall back to covers. Signed delivery and offline catalog caching include thumbnails. Browser selection and real-database persistence/fallback/delivery checks passed.

## Media creation update

File-only uploads replace Paste URL. Alt is generated from the filename and can be edited. Image/video/audio type is inferred, and hash, processing, duration, original filename and generated poster are hidden from the creation form. Saved media shows a readiness message and friendly duration; the hash is plain text under File details. Browser selection/autofill/edit checks, automatic audio/video processing smoke, typecheck and the CMS build passed. All four migrations apply to a fresh database.

## Story editor update

Slug now has Copy name, Published At is editable and preserved, and tags support inline creation/reuse with removable chips. The numeric content counter was removed from the schema, API and client; updatedAt detects download updates. Existing numeric-version downloads are offered an update on the next online catalog fetch. Browser checks passed for slug copying, calendar selection, new tag creation and case-insensitive reuse. The local editor smoke verified date persistence, advancing timestamps, manifest timestamps and saved tag relationships. No user story was changed by the smoke test.

Verified on Windows on 2026-11-07. This is a runnable local first version, not a production launch certification. All code is in this repository; cloud deployment and native binary delivery are not claimed.

## Completed

- [x] PNPM monorepo, Expo shared client, Payload/Next CMS, PostgreSQL, environment setup, Docker and optional embedded local database.
- [x] Stories, localized metadata/pages, tags, structured ages, immutable media hashes, version history and publication validation.
- [x] Manual narration upload, timing JSON import/editor and audio/highlight preview components.
- [x] Regional country/channel Home rules, deterministic precedence, visibility/access separation and editable catalog matrix.
- [x] Protected versioned APIs, administrator-only raw CMS operations, signed development sessions and scoped media capabilities.
- [x] Responsive catalog, 10-item pagination, filters, details, persistent guest Favorites/progress and completion prompt.
- [x] Narrated five-page reader, actual-position highlighting, video, independent replay controls, music ducking, transitions and effect timing.
- [x] Verified first-page essentials, prioritized preloading, persistent downloads, retry, eviction detection, safe version replacement and deletion.
- [x] Local FFmpeg processing for pending audio/video, original retention, normalization, durations and generated posters.
- [x] Twelve fixture records with English, Spanish and Georgian text/narration/timings; Global, US and Spain Home configurations.
- [x] Unity bridge schemas/C# example and future entitlement/profile/learning-event contracts.

## Acceptance evidence

“Implemented” means code exists; the evidence column distinguishes it from an exercised workflow.

| #     | Criterion                                                | Evidence / remaining validation                                                                                                                                                                      |
| ----- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | CMS administrator sign-in                                | Real Payload login smoke passed; first-user browser screen rendered. No permanent admin password seeded.                                                                                             |
| 2–4   | Localized story editing, page ordering and media uploads | Payload schemas and seed exercised against PostgreSQL; actual audio/video processing smoke passed. Full human editor UI walkthrough remains.                                                         |
| 5     | Import/edit timings and preview                          | Custom timing editor and authenticated draft preview compile; client highlighting browser-tested. Authenticated custom-editor interaction remains untested.                                          |
| 6     | Tags and ages                                            | CMS fields, API and filtering unit tests passed.                                                                                                                                                     |
| 7–8   | Home variants and access overrides                       | Shared rules tested; custom Home matrix implemented, authenticated matrix interaction untested.                                                                                                      |
| 9     | Preview and publishing                                   | Preview route builds; invalid publication rejected in real database smoke. Preview music/effects parity remains partial.                                                                             |
| 10–11 | Catalog pagination and filters                           | Real API 10+2 smoke, age/tag domain tests and browser catalog checks passed.                                                                                                                         |
| 12–13 | Details and persistent Favorites                         | Browser dialog, save/reload and Favorites flow exercised; guest persistence tests passed.                                                                                                            |
| 14–16 | Free/Premium and development mock                        | Free playback browser-tested; direct locked manifests denied; signed Premium session and protected media tested in API and browser. Production mock disabled.                                        |
| 17–18 | Video/narration/highlighting                             | Browser animated page and actual-position English/Georgian word highlighting observed.                                                                                                               |
| 19–22 | Cues, independent replay and continuous music            | Timing/cue logic tests and browser replay controls exercised. Audio cleanup/ducking/fades implemented; physical-device interruption and acoustic mix verification remain.                            |
| 23    | Preloading                                               | Priority unit test passed; current-page illustration/narration verified before opening. Video decoder readiness is not separately modeled.                                                           |
| 24–26 | Persistent complete offline downloads                    | Browser downloaded story, stopped both servers, reloaded app and traversed all five pages. Eight download tests cover restart, retry, failed update, expiry and eviction. Native offline unverified. |
| 27    | Completion and Favorites offer                           | Browser finish returns Home; persisted completion and prompt flow implemented.                                                                                                                       |
| 28    | Web app                                                  | Expo production export and real-browser checks passed.                                                                                                                                               |
| 29    | Shared mobile code                                       | Expo dependency compatibility and TypeScript checks passed. No Android/iOS binary or physical-device tests.                                                                                          |
| 30–31 | Unity and future interfaces                              | Versioned bridge, plugin-neutral C# sample and shared types supplied. Existing Unity project/provider credentials absent.                                                                            |
| 32    | Setup and automated checks                               | Setup scripts, migrations, seed and documented commands supplied; results below.                                                                                                                     |

## Checks run

| Check                                          | Result                                                                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`                                    | **33 passed**, five test files (15 domain, 8 downloads, 4 guest, 4 session, 2 editor).                                                                        |
| `pnpm typecheck`                               | Passed root, CMS and client.                                                                                                                                  |
| `pnpm lint`                                    | Passed.                                                                                                                                                       |
| `pnpm build:web`                               | Expo web export passed.                                                                                                                                       |
| `pnpm --filter @fairytails/cms build`          | Next production build passed.                                                                                                                                 |
| Expo dependency compatibility                  | Passed `expo install --check`.                                                                                                                                |
| `apps/cms`: `pnpm exec tsx src/smoke.ts`       | Passed real login, pagination, public-access denial, three languages, signed Premium/media, byte ranges and invalid publish checks.                           |
| `apps/cms`: `pnpm exec tsx src/media-smoke.ts` | Passed real FFmpeg audio/video normalization, duration, poster and hash checks.                                                                               |
| `node scripts/check-migrations.mjs`            | All three migrations applied to a fresh temporary UTF-8 database in production mode.                                                                          |
| Browser                                        | Catalog/details, language switching, Premium test controls, narrated video reader, replay, Favorites, completion and full downloaded offline story exercised. |

Integration smoke commands create/delete their own temporary records. Migration check creates/drops its own temporary database. Run only against local development infrastructure. Unit tests do not constitute comprehensive React component or cross-browser coverage.

## Incomplete initial-release work

- [ ] Real Android/iOS device and Unity WebView validation: audio focus/interruption, background/rotation, video decoding, file persistence and memory pressure. This Windows environment has no configured Android SDK and cannot build iOS.
- [ ] Full authenticated CMS editor UI walkthrough, including matrix persistence and timing file import. API validation and compilation passed, but this does not prove all editor gestures.
- [ ] Complete navigation/dialog/player translations; some secondary strings remain English. Story recordings/text are complete in all three demo languages.
- [ ] Draft preview parity for music, effects and all transition behavior; a dedicated localization completeness dashboard and visual sound-effect timeline remain absent. Publication errors identify incomplete languages/pages.
- [ ] Cache storage usage/budget UI, bounded preload eviction, persistent cleanup retries and fine-grained video decode readiness. Offline tags are not separately cached.
- [ ] Object-storage processing/staging, CDN deployment, distributed worker leases/retries, indexed large-catalog querying and distributed per-client rate limits. S3/R2 private signed delivery code exists but has not been cloud-tested.
- [ ] Launch privacy/accessibility review, content/voice editorial review and platform store checks. See [privacy notes](docs/PRIVACY.md).

## Known limitations and decisions

- Saving a published story as Draft unpublishes it immediately; independent live and working draft revisions are not implemented.
- The twelve records reuse one five-page narrative. Illustrations are original lightweight vector-derived assets; synthetic multilingual narration is test quality. See [asset provenance](docs/DEMO_ASSETS.md).
- Development Premium sessions last 30 minutes and reset on reload. Media tickets last 10 minutes; refresh the manifest if a long-running reader needs new uncached assets after expiry. Automatic ticket renewal remains work.
- Production currently serves Free content only until a real entitlement verifier is integrated. Premium offline expiry is a development policy, not a signed revocable production license or DRM.
- API repository scans cap at 1,000 records; cursor ordering can change during edits. Local worker concurrency is one.
- Best-effort old-media cleanup can leave unreferenced bytes after a storage deletion error; it does not invalidate the new verified download.
- No remaining failing automated check was observed. This does not imply there are no untested runtime defects. Browser testing found and fixed identical-hash/different-ID media authorization, and a regression test covers it.

## Explicitly deferred future functionality

Real billing/subscription verification, parent authentication, cloud sync, multiple child-profile UI, educational games/statistics and interactive Rive/PixiJS scenes are intentionally deferred by the specification. Their contracts are separate from the incomplete initial-release work above. Unity trusted-session exchange requires the existing app's verifier and is documented without fabricated credentials.

## Current workspace and restart

Generated demo media, local environment secrets, database files and build output are ignored by Git and remain on disk. The database and CMS were restarted as requested. For this already seeded workspace, run `node scripts/local-db.mjs`, `pnpm dev:cms` and `pnpm dev:web` in three terminals. Do not rerun initial migrations against a database already managed by development schema push. The README migration steps are for a fresh database.
