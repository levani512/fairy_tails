export const needsPhoneRotation = (width: number, height: number) =>
  width < 600 && height > width;

export const WIDE_READER_RATIO = 1.6;

export function readerLayout(width: number, height: number, aspect: number) {
  const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  const wide = width / height >= WIDE_READER_RATIO;
  const stacked = !wide;
  const compact = width < 700 || height < 500;
  if (stacked) {
    // Reserve the toolbar, readable narration viewport and fixed navigation.
    const imageHeight = Math.min(
      Math.max(120, width - 24) / ratio,
      Math.max(120, Math.min(height * 0.58, height - 304)),
    );
    return {
      stacked,
      wide: false,
      compact,
      imageWidth: imageHeight * ratio,
      imageHeight,
    };
  }
  const availableHeight = wide
    ? Math.max(120, height - 24)
    : Math.max(120, height * 0.46);
  const availableWidth = wide ? width * 0.66 - 16 : width - 88;
  const imageWidth = Math.min(
    Math.max(120, availableWidth),
    availableHeight * ratio,
  );
  return {
    stacked,
    wide,
    compact,
    imageWidth,
    imageHeight: imageWidth / ratio,
  };
}

// Story controls sit outside the side-by-side illustration and narration frames.
export function storyPageLayout(width: number, height: number, aspect: number) {
  const layout = readerLayout(width, height, aspect);
  if (layout.stacked) return layout;
  const toolbar = layout.compact ? 60 : 76;
  const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  const imageHeight = Math.max(0, height - toolbar - 6);
  // Fill the scene vertically while retaining a readable narration column.
  // Media uses contain if the available width limits its natural aspect ratio.
  const narrationWidth = Math.max(180, width * 0.25);
  const imageWidth = Math.max(
    0,
    Math.min(width - narrationWidth - 30, imageHeight * ratio),
  );
  return { ...layout, imageHeight, imageWidth };
}
