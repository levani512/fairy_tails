# Content workflow

## Narration generation and syncing

Set `ELEVENLABS_API_KEY` in `apps/cms/.env`, then restart the CMS. The key stays on the backend. `ELEVENLABS_MODEL_ID` optionally selects a speech model (default `eleven_v3`); choose a model that supports your narration language and account. Generation and forced alignment use your ElevenLabs account credits.

For each page language, enter Narration text, select Narration voice, and click Generate voice. Listen to the preview, then click Use this audio to upload and assign it. Generating a preview does not replace existing narration or save a Media record; discarded previews are released. You can also use Narration audio → Create New to upload a recording or Choose from existing.

After audio processing finishes, click Sync audio with text. The backend sends the selected recording and transcript to ElevenLabs forced alignment, fills the word timings and duration, and retains the source text/audio identity. Review highlighting in the timing editor and save the story. Changing text or selected audio clears stale timings; a changed synchronized source cannot be published until synced again. Generation and sync results are discarded if their source changes while the request is running. New narration text is limited to 5,000 characters per request. Word timings may still be imported or adjusted manually.

API references: [speech generation](https://elevenlabs.io/docs/api-reference/text-to-speech/convert), [voices](https://elevenlabs.io/docs/api-reference/voices/search), [forced alignment](https://elevenlabs.io/docs/api-reference/forced-alignment/create).

Unfinished content can be saved with Status = Draft (a slug is required). Publishing requires complete language/page content. A failed publication shows a validation message next to Status listing missing content; choose Draft to save work in progress. Failed publishing does not overwrite an existing saved draft.

1. Open `/admin` and create the first administrator, or sign in. Administration is separate from anonymous reading.
2. Create tags with stable identifiers and localized labels using Payload's locale selector.
3. In Media, use Select a file (or drag and drop). URL uploads are disabled. Alt fills from the filename and remains editable; image/video/audio kind is inferred automatically. Images are ready after upload. Audio/video are prepared by the background worker, which extracts duration, normalizes media and creates a video poster. After saving, readiness and length appear as plain text; the automatic hash is under File details. These technical values are not creation fields. Attach audio as narration, music or effects in the story editor. File uploads are limited to 150 MB and the configured formats.
4. Create a Story. Enter Default Title and click Copy title beside Slug next to Default Title to generate a lowercase, hyphenated slug. Set numeric age bounds, default Free/Premium level and a default cover. Type tags and press Enter: existing tags are reused, new tags are created, and selected tags appear as removable chips. Leave status Draft.
5. The top of the form shows Default Title, Slug and Default Language on one row, followed by Default Description, Default Cover and Default Thumbnail, followed by Status, Published At, ages, Access and Tags. Additional languages follow, then Music and Pages. The thumbnail is used for story cards; leaving it empty uses the cover. Under Additional languages, click Add Language to enter another language with its own Title, Description, Cover and Thumbnail. Empty localized images use the default images. English, Spanish and Georgian are configured; extend both shared language schemas and Payload configuration to add languages.
6. Add pages with a name and one Illustration: select either an image or MP4 video. The app detects the type automatically. Video pages use the story cover as their shared poster/fallback; there is no separate page Poster, Fit or Layout control. Images are contained and narration text appears below. Drag rows to reorder; use Payload's row actions to duplicate/remove pages. Enter Narration text and Narration audio directly in Default language narration, which follows the story Language. Use Additional narration languages → Add Language only when another language is needed; it has its own text, audio and timings, plus an optional localized image/video override.
7. Enter exact text and upload narration for that same language. Set its actual duration and optional start delay. Paste/import a timing JSON array into Timings, then edit values manually. Example:

```json
[
  { "index": 0, "text": "Hello", "offset": 0, "startMs": 100, "endMs": 500 },
  { "index": 1, "text": "world", "offset": 7, "startMs": 600, "endMs": 1000 }
]
```

For `Hello, world!`, the second token begins at UTF-16 offset 7. Timing entries must be ordered, non-overlapping, in bounds and match the exact text. Punctuation outside timed tokens remains visible. Missing timings are never synthesized by the player. Automatic TTS/alignment providers are not enabled.

8. Configure story music in the compact Music row: asset, volume, loop, Lower music during narration, and Fade Duration in seconds (for example, 0.4 or 1.5). Existing fade values are converted for display; playback timing remains compatible. Set a page override only when needed. Add effects with asset, timestamp, volume, and animation-timeline flag. Narration-timeline effects follow narration; animation effects replay with animation. Related story/page fields share rows on desktop and wrap on smaller screens.
9. Save, then use the authenticated draft preview link. It previews complete language versions and supports audio/highlighting, page navigation, and video controls. It is not yet a full player-identical music/effects preview. Incomplete languages do not appear.
10. Change status to Published and save. Validation rejects missing/mismatched text, timings, unready media and incorrect media types. The error identifies the language and page/path. Use version history to inspect/restore snapshots. To unpublish, save status Draft or Archived. Saving Draft currently removes the live publication immediately.
11. In Homes, configure a global fallback and any country/channel variants. Set priority, country codes and inclusion/exclusion lists. The catalog matrix edits visibility, access override, featured status and display order; structured entry rows remain available for detailed editing.

Do not edit the bytes of an existing uploaded asset. Upload a replacement and change the story reference; saving advances updatedAt, which clients use to detect changes. Published At is editable using the date/time picker and is preserved on later saves; it is an editorial date, not a publication scheduler. The timing editor supports JSON file import, editable token rows and audio/highlight preview. Test country/channel/access through the development client parent controls or DEV_COUNTRY/DEV_PREMIUM defaults. Production disables development access controls.



