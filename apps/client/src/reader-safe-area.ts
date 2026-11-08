// iPhones have a portrait natural orientation. Unknown angles keep both insets.
export function phoneNotchSide(
  angle: number | undefined,
  width: number,
  height: number,
): 'left' | 'right' | null {
  if (width <= height || angle === undefined) return null;
  const normalized = ((angle % 360) + 360) % 360;
  if (normalized === 90) return 'left';
  if (normalized === 270) return 'right';
  return null;
}
