# Client API v1

Story previews and manifests carry `updatedAt` (ISO 8601 UTC) instead of a numeric content version. Compare timestamps for download updates; content hashes still verify individual files. Rebuild clients together with this API change.

Previews also carry `thumbnail`, a signed public image reference for story cards. It resolves from the language thumbnail, then default thumbnail, then the language/default cover. `cover` remains the detail image. Both use the scoped public-image delivery path.

Success: `{ "data": ... }`. Failure: `{ "error": { "code": "PREMIUM_REQUIRED", "message": "..." } }`.

| GET endpoint                            | Result                                                          |
| --------------------------------------- | --------------------------------------------------------------- |
| `/api/v1/config`                        | Languages, resolved country/channel, deferred feature flags     |
| `/api/v1/tags`                          | Active CMS tags and localized labels                            |
| `/api/v1/home`                          | Up to 10 previews, nextCursor, selected variant                 |
| `/api/v1/stories/:id/preview`           | Metadata/cover, lock state, available languages                 |
| `/api/v1/stories/:id/manifest`          | Authorized playable story                                       |
| `/api/v1/stories/:id/download-manifest` | Authorized offline manifest, expiry for development Premium     |
| `/api/v1/access/stories/:id`            | Effective access/lock state                                     |
| `/api/v1/assets/:id`                    | Authorized immutable asset; internal URLs supplied by manifests |

Home query: `language=en`, optional `age=2..12`, comma-separated `tags`, opaque `cursor`, and `limit=1..10` (default 10). Reset cursor when any filter changes. A removed cursor produces INVALID_INPUT, prompting a reload. IDs are Payload record IDs, not slugs; fixture API uses `tale-01` style IDs.

Typed errors: NOT_FOUND, REGION_UNAVAILABLE, LANGUAGE_UNAVAILABLE, PREMIUM_REQUIRED, SESSION_EXPIRED (reserved), ASSET_MISSING, INVALID_INPUT, SERVER_FAILURE. Invalid query values return 400. Protected manifests return 403; absent records return 404. Production ignores client Premium/region/channel claims.

Media URLs include story, language, content hash and a 10-minute HMAC capability bound to the asset/context. Covers add `cover=1`; this can only retrieve that story's actual cover. This permits native/browser media elements to load authorized media without a custom Authorization header. Invalid/expired capabilities return 401. Refresh the manifest for fresh URLs. Local media supports single byte ranges, suffix ranges and 416 errors. Production S3 delivery uses a short-lived private signed redirect. Configure object-storage CORS separately; no cloud test has been run.

Development only: `POST /api/v1/development/session` accepts `{country:"US",channel:"web",premium:true}` and returns `{data:{token,country,channel,premium}}`. Send `Authorization: Bearer <token>` on subsequent content requests. Sessions expire after 30 minutes. The endpoint is disabled in production, which also rejects development session/media capabilities. Do not expose a development server publicly.

Current repository loader scans at most 1,000 published stories/Home variants/tags. Replace this with indexed database filtering and stable signed cursors before a larger catalog launch. Current cursors are deterministic IDs, not signed snapshots; edits between requests can change ordering.

Admin REST operations under `/api/stories`, `/api/media`, etc. require Payload administrator authentication. There is no public mutation endpoint and no production billing/session exchange endpoint.
