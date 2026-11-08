export const ILLUSTRATION_WIDTH = 2752;
export const ILLUSTRATION_HEIGHT = 1536;
export const ILLUSTRATION_ASPECT = ILLUSTRATION_WIDTH / ILLUSTRATION_HEIGHT;
export function illustrationSizeError(width: number, height: number) {
  return width === ILLUSTRATION_WIDTH && height === ILLUSTRATION_HEIGHT
    ? undefined
    : `Story illustrations must be exactly 2752 × 1536 pixels. This file is ${width} × ${height}.`;
}
