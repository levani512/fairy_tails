# Storybook visual system

The client follows the approved iPhone/iPad lobby reference: ivory paper, dark brown rounded typography, leaf-accented orange wordmark, olive selection pills, thin warm borders, softly raised cards, and orange reading controls.

## Assets

- `apps/client/assets/design/paper.png`: generated with the built-in image generation tool, November 8, 2026. Applied at 48% opacity by `Paper` so it stays quiet behind text. Original output preserved outside the repository; the app uses this bundled copy.
- `apps/client/assets/design/Nunito.ttf`: bundled variable font from Google Fonts' official `ofl/nunito/Nunito[wght].ttf`. SIL Open Font License included as `OFL-Nunito.txt`. Expo Font loads it before rendering the app; no runtime font CDN request.
- `apps/client/src/Storybook.tsx`: reusable Text/TextInput, Paper, vector leaf wordmark and SVG outline icons. These are deterministic, resolution-independent code assets. Change shared colors in `theme.ts`.

Final generation prompt (built-in tool, no CLI fallback):

> Create a production UI background texture asset for a warm children's fairy tale reading app. Square 1024x1024, flat evenly lit ivory cream handmade watercolor paper, base color #FFF9EF. Extremely subtle warm pale beige fibers and softly mottled watercolor grain, very low contrast so dark brown small text remains completely legible everywhere. Seamless looking edges, no vignette, no border, no objects, no text, no drawings, no shadows. This is only a quiet paper texture, not a UI mockup.

## Content and behavior

Story thumbnails and character portraits remain admin-managed content. The reference's sample watercolor stories are not substituted for actual stories. The character shelf follows the story grid and is hidden when no characters exist. Continue Reading shows real saved progress, with the percentage calculated from the story's manifest; if unavailable offline, it falls back to the saved page label.

Favorites and downloads remain on every story card. Profile switching, filtering, language selection, quizzes and player audio behavior are preserved. The existing wide/stacked reader ratio and portrait-phone rotation prompt are unchanged. The quiz retains its 90% white cover overlay, correctness colors, audio and confetti.

UI components share the style across lobby, story popup, parental center, player controls/settings and quiz. Phone grids remain two columns; larger screens use three/four columns. Long content can wrap or scroll rather than being replaced with mockup copy.
