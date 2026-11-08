import { expect, it } from 'vitest';
import {
  readerLayout,
  needsPhoneRotation,
  storyPageLayout,
} from '../apps/client/src/reader-layout';

it.each([
  [750, 369],
  [844, 390],
  [932, 409],
  [1200, 650],
])(
  'fits larger wide story frames below the top controls at %ix%i',
  (width, height) => {
    const layout = storyPageLayout(width, height, 2752 / 1536);
    expect(layout.wide).toBe(true);
    const toolbar = layout.compact ? 60 : 76;
    expect(layout.imageHeight + toolbar + 6).toBeCloseTo(height);
    expect(layout.imageWidth / layout.imageHeight).toBeLessThanOrEqual(
      2752 / 1536 + 1e-10,
    );
    // Left margin, inter-frame gap and right margin still leave readable text.
    expect(width - layout.imageWidth - 30).toBeGreaterThanOrEqual(180);
  },
);

it('keeps the tablet story arrangement unchanged', () => {
  expect(storyPageLayout(1024, 768, 2752 / 1536)).toEqual(
    readerLayout(1024, 768, 2752 / 1536),
  );
});

it('requests rotation only on portrait phone-sized screens', () => {
  expect(needsPhoneRotation(390, 844)).toBe(true);
  expect(needsPhoneRotation(320, 568)).toBe(true);
  expect(needsPhoneRotation(844, 390)).toBe(false);
  expect(needsPhoneRotation(768, 1024)).toBe(false);
});

it.each([
  [1600, 1000, true],
  [1599, 1000, false],
  [800, 500, true],
  [799, 500, false],
  [1920, 1080, true],
  [600, 600, false],
])('selects layout by ratio at %ix%i', (width, height, wide) => {
  expect(readerLayout(width, height, 16 / 9).wide).toBe(wide);
  expect(readerLayout(width, height, 16 / 9).stacked).toBe(!wide);
});

it.each([
  [390, 844],
  [844, 390],
  [768, 1024],
  [1024, 768],
  [320, 568],
])('fits the illustration without cropping at %ix%i', (width, height) => {
  for (const ratio of [16 / 9, 4 / 3, 1]) {
    const layout = readerLayout(width, height, ratio);
    expect(layout.imageWidth / layout.imageHeight).toBeCloseTo(ratio);
    expect(
      layout.imageWidth + (layout.stacked ? 0 : layout.wide ? 200 : 88),
    ).toBeLessThanOrEqual(width);
    if (!layout.stacked) expect(layout.imageHeight).toBeLessThan(height);
    if (!layout.wide) expect(layout.imageHeight).toBeGreaterThan(128);
  }
});
it.each([
  [768, 1024],
  [1024, 768],
  [820, 1180],
  [1180, 820],
  [600, 600],
])('reserves space for text and navigation at %ix%i', (width, height) => {
  for (const aspect of [16 / 9, 4 / 3, 1, 9 / 16]) {
    const layout = readerLayout(width, height, aspect);
    expect(layout.stacked).toBe(true);
    expect(layout.imageHeight + 304).toBeLessThanOrEqual(height);
    expect(layout.imageWidth).toBeLessThanOrEqual(width - 24);
    expect(layout.imageWidth / layout.imageHeight).toBeCloseTo(aspect);
  }
});
it('preserves the wide phone layout', () => {
  expect(readerLayout(844, 390, 16 / 9).stacked).toBe(false);
  expect(readerLayout(844, 390, 16 / 9).wide).toBe(true);
});
