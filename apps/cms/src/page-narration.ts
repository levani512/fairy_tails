/** Preserve legacy narration rows while presenting the story's default language directly. */
export function normalizePageNarration(doc: any) {
  const language = doc.defaultLanguage ?? 'en';
  return {
    ...doc,
    pages: doc.pages?.map((page: any) => {
      const legacy =
        !page.defaultNarration?.text && !page.defaultNarration?.narration
          ? page.translations?.find((t: any) => t.language === language)
          : undefined;
      if (!legacy) return page;
      const narration = { ...legacy };
      delete narration.language;
      delete narration.id;
      return {
        ...page,
        defaultNarration: narration,
        translations: page.translations.filter((t: any) => t !== legacy),
      };
    }),
  };
}

export function pageNarrationLanguages(page: any, defaultLanguage: string) {
  return [
    { ...page.defaultNarration, language: defaultLanguage },
    ...(page.translations ?? []),
  ];
}
