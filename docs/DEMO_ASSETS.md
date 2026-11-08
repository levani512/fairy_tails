# Demonstration assets and attribution

All story text, translations, SVG illustrations, tone music and chimes in this project were created for this implementation. Twelve catalog records deliberately reuse one five-page original narrative to exercise pagination and access rules; they are not twelve editorially distinct books.

English voices in this workspace were synthesized locally with installed Windows System.Speech voices, with word positions from speech progress events. `scripts/narrate.ps1` regenerates them. The cross-platform fallback and Spanish/Georgian voices use eSpeak-NG locally. `scripts/narrate-multilingual.mjs` records synthesis word events and actual PCM duration; it does not estimate synchronization from text length. These voices sound robotic and translations/pronunciation require fluent editorial review before public launch.

eSpeak-NG's Emscripten development package is GPL-3.0; see its installed COPYING and https://github.com/echogarden-project/espeak-ng-emscripten. It is used by a development generator and is not bundled into the reader. FFmpeg's installed binary includes GPL components; see its distribution license. Review redistribution obligations before shipping tools or binaries. Generated media must also be reviewed under the applicable installed voice terms. No external narration credentials were used.

`pnpm demo:assets` generates all fixtures locally. Existing English recordings are retained; use the Windows script explicitly to replace them. Generated binaries are ignored by Git, so run generation on a fresh clone before seeding. Story assets served by the separate fixture server are public originals; the CMS delivers its own uploaded copies through authorization.
