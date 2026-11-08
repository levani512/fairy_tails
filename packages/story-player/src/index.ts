import type { Timing } from '../../shared/src/index';
export function activeWord(timings: Timing[], positionMs: number): number {
  let lo = 0,
    hi = timings.length - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1,
      t = timings[m];
    if (positionMs < t.startMs) hi = m - 1;
    else if (positionMs >= t.endMs) lo = m + 1;
    else return m;
  }
  return -1;
}
export function textSegments(text: string, timings: Timing[]) {
  const result: { text: string; index: number }[] = [];
  let cursor = 0;
  timings.forEach((t, i) => {
    if (t.offset > cursor)
      result.push({ text: text.slice(cursor, t.offset), index: -1 });
    result.push({
      text: text.slice(t.offset, t.offset + t.text.length),
      index: i,
    });
    cursor = t.offset + t.text.length;
  });
  if (cursor < text.length)
    result.push({ text: text.slice(cursor), index: -1 });
  return result;
}
/** Each timeline has its own cursor. Seek backwards/replay resets only that timeline. */
export class CueTimeline {
  private previous = -1;
  advance(positionMs: number, cues: { atMs: number }[]) {
    if (positionMs < this.previous) this.previous = -1;
    const due = cues
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.atMs > this.previous && c.atMs <= positionMs)
      .map(({ i }) => i);
    this.previous = positionMs;
    return due;
  }
  reset() {
    this.previous = -1;
  }
}
export function nextPage(index: number, count: number) {
  return index + 1 >= count
    ? { complete: true, index }
    : { complete: false, index: index + 1 };
}
