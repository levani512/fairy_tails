/** Lift the former default translation into the main form without losing old content. */
export function normalizeStoryMetadata(doc: any) {
  const translations = doc.translations ?? [];
  const language = doc.defaultLanguage ?? translations[0]?.language ?? 'en';
  const legacy =
    doc.title == null && doc.description == null
      ? translations.find((t: any) => t.language === language)
      : undefined;
  return {
    ...doc,
    defaultLanguage: language,
    title: doc.title ?? legacy?.title,
    description: doc.description ?? legacy?.description,
    defaultCover: legacy?.cover ?? doc.defaultCover,
    defaultThumbnail: legacy?.thumbnail ?? doc.defaultThumbnail,
    translations: legacy
      ? translations.filter((t: any) => t !== legacy)
      : translations,
  };
}

export function storyMetadataLanguages(doc: any) {
  const normalized = normalizeStoryMetadata(doc);
  return [
    {
      language: normalized.defaultLanguage,
      title: normalized.title,
      description: normalized.description,
      cover: normalized.defaultCover,
      thumbnail: normalized.defaultThumbnail,
    },
    ...normalized.translations,
  ];
}
