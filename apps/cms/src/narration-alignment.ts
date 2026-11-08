export function alignmentTimings(
  text: string,
  words: { text: string; start: number; end: number }[],
  durationMs: number,
) {
  let cursor = 0,
    previousEnd = 0;
  const timings = words
    .filter((w) => w.text.trim())
    .map((word, index) => {
      const offset = text.indexOf(word.text, cursor);
      const startMs = Math.round(word.start * 1000),
        endMs = Math.round(word.end * 1000);
      if (
        offset < cursor ||
        /[\p{L}\p{N}]/u.test(text.slice(cursor, offset)) ||
        !Number.isFinite(startMs) ||
        !Number.isFinite(endMs) ||
        startMs < previousEnd ||
        endMs <= startMs ||
        endMs > durationMs
      )
        throw new Error(
          'Alignment could not match the text and audio. Check the transcript and try again.',
        );
      cursor = offset + word.text.length;
      previousEnd = endMs;
      return { index, text: word.text, offset, startMs, endMs };
    });
  if (!timings.length || /[\p{L}\p{N}]/u.test(text.slice(cursor)))
    throw new Error('Alignment did not cover the full narration text.');
  return timings;
}
