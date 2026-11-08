# Lobby organization

## Admin

Categories, Tags, and Characters are independent collections. On each story, select any number of Categories and Characters using their separate relationship fields. Use the plus button to create a record without leaving the story editor. Tags remain descriptive topics with their existing type-to-create field.

Categories have a name, active flag, and display order. Night Stories, Day Stories, and Character Series are provided initially. Add further categories in Admin → Categories.

Characters require a name and an image. Create them in Admin → Characters, select or upload an image, and assign them to stories. Character images appear in Meet the Characters once media processing is ready. Inactive characters and their images are not publicly delivered. Names and images are independent of story titles and thumbnails.

Existing story tags are preserved as ordinary tags. Special tag names no longer determine categories or characters; use the separate fields to assign those relationships.

## Lobby filters

Category buttons are loaded from active Categories. Meet the Characters is loaded from active Characters with ready images. Clicking characters toggles them independently: stories featuring ANY selected character match. Topic tags require ALL selected tags. Category, age, tags, and characters combine together. Reset filters clears all four.

Age groups include any story whose age range overlaps the selected group. Ages 2–6 therefore match 2–3, 4–5, and 6–8. Age 9+ has no upper limit.

Continue Reading uses saved progress for the selected language. The current catalog does not include page totals or durations, so the UI shows the saved page rather than an invented percentage or reading time. Parental Center retains the parent gate and a placeholder for future content.

## Validation

`pnpm test` covers filter intersections and multi-character matching. From apps/cms, `pnpm exec tsx src/taxonomy-smoke.ts` checks multi-value persistence, character image delivery, inactive-image protection, and required image validation, cleaning up its own temporary records. The taxonomy migration adds the collections, relationship columns, version relationships, and initial categories. Local development schema-push installations can run `pnpm exec tsx src/setup-taxonomy.ts` to initialize the default categories idempotently.
