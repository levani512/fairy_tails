import type {
  Preview,
  Tag,
  Category,
  Character,
} from '../../../packages/shared/src/index';

export const ageGroups = ['', '1', '2–3', '4–5', '6–8', '9+'];
export function childAgeGroup(age: number) {
  return age < 2
    ? '1'
    : age <= 3
      ? '2–3'
      : age <= 5
        ? '4–5'
        : age <= 8
          ? '6–8'
          : '9+';
}
const normalizeInterest = (value: string) =>
  value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
export function interestScore(
  story: Preview,
  interests: string[],
  tags: Tag[],
  categories: Category[] = [],
  characters: Character[] = [],
) {
  const labels = [
    ...tags
      .filter((tag) => story.tags.includes(tag.id))
      .flatMap((tag) => Object.values(tag.labels)),
    ...categories
      .filter((c) => story.categories?.includes(c.id))
      .map((c) => c.name),
    ...characters
      .filter((c) => story.characters?.includes(c.id))
      .map((c) => c.name),
  ]
    .filter((label): label is string => !!label)
    .map(normalizeInterest);
  return interests.filter((interest) =>
    labels.includes(normalizeInterest(interest)),
  ).length;
}
export function matchesLobby(
  story: Preview,
  age: string,
  selected: string[],
  category: string,
  characters: string[] = [],
) {
  const range =
    age === '1'
      ? [1, 1]
      : age === '2–3'
        ? [2, 3]
        : age === '4–5'
          ? [4, 5]
          : age === '6–8'
            ? [6, 8]
            : age === '9+'
              ? [9, Infinity]
              : [0, Infinity];
  return (
    story.minAge <= range[1] &&
    story.maxAge >= range[0] &&
    selected.every((id) => story.tags.includes(id)) &&
    (!category || (story.categories ?? []).includes(category)) &&
    (!characters.length ||
      characters.some((id) => (story.characters ?? []).includes(id)))
  );
}
