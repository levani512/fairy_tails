export function slugFromName(name: string) {
  return name
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function publicationDate(
  status: string,
  supplied: string | null | undefined,
  previous: string | null | undefined,
  now: string,
) {
  if (supplied !== undefined) return supplied;
  return previous ?? (status === 'published' ? now : undefined);
}
