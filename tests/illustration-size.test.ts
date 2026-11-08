import { expect, it } from 'vitest';
import {
  illustrationSizeError,
  ILLUSTRATION_ASPECT,
} from '../packages/shared/src/illustration';
it('accepts only the exact landscape illustration dimensions', () => {
  expect(illustrationSizeError(2752, 1536)).toBeUndefined();
  for (const [width, height] of [
    [1536, 2752],
    [1376, 768],
    [2752, 1535],
    [0, 0],
  ]) {
    expect(illustrationSizeError(width, height)).toContain('2752 × 1536');
  }
  expect(ILLUSTRATION_ASPECT).toBe(2752 / 1536);
});
