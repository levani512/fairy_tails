import type { Asset } from '../../../packages/shared/src/index';

export function pageVisual(
  selected: Asset | undefined,
  storyCover: Asset | undefined,
) {
  if (!selected) throw new Error('Select an illustration image or video.');
  if (selected.mime === 'video/mp4') {
    if (!storyCover?.ready || !storyCover.mime.startsWith('image/'))
      throw new Error('A ready story cover image is required for video pages.');
    return { illustration: storyCover, video: selected, poster: storyCover };
  }
  if (!selected.mime.startsWith('image/'))
    throw new Error('Illustration must be an image or MP4 video.');
  return { illustration: selected, video: undefined, poster: undefined };
}

// Present older separate image/video records through the single upload control.
// Hidden legacy fields remain in storage until the record is next saved.
export function normalizePageVisuals<T extends { pages?: any[] | null }>(
  doc: T,
): T {
  for (const page of doc.pages ?? []) {
    if (page.video) {
      page.illustration = page.video;
      page.video = null;
    }
    for (const translation of page.translations ?? []) {
      if (translation.video) {
        translation.illustration = translation.video;
        translation.video = null;
      }
    }
  }
  return doc;
}
