import { describe, expect, it } from 'vitest';
import {
  matchesLobby,
  childAgeGroup,
  interestScore,
} from '../apps/client/src/lobby';
import type { Preview } from '../packages/shared/src';
const story = {
  minAge: 2,
  maxAge: 6,
  tags: ['animals', 'friendship'],
  categories: ['night', 'series'],
  characters: ['pig', 'wolf'],
} as Preview;
describe('lobby filters', () => {
  it('selects the child age band and matches normalized interests against story taxonomy', () => {
    expect([1, 2, 4, 6, 9, 17].map(childAgeGroup)).toEqual([
      '1',
      '2–3',
      '4–5',
      '6–8',
      '9+',
      '9+',
    ]);
    const tags = [
      {
        id: 'animals',
        active: true,
        order: 0,
        labels: { en: '♧ Animals', es: 'Animales' },
      },
    ];
    expect(interestScore(story, ['Animals'], tags)).toBe(1);
    expect(interestScore(story, ['Space'], tags)).toBe(0);
    expect(
      interestScore(story, ['Night Stories'], tags, [
        { id: 'night', name: 'Night Stories', active: true, order: 0 },
      ]),
    ).toBe(1);
  });
  it('matches every age group overlapped by ages 2–6', () => {
    for (const age of ['2–3', '4–5', '6–8'])
      expect(matchesLobby(story, age, [], '')).toBe(true);
    expect(matchesLobby(story, '9+', [], '')).toBe(false);
  });
  it('combines category with all selected topic tags', () => {
    expect(matchesLobby(story, '', ['animals', 'friendship'], 'night')).toBe(
      true,
    );
    expect(matchesLobby(story, '', ['magic'], 'night')).toBe(false);
    expect(matchesLobby(story, '', [], 'day')).toBe(false);
    expect(matchesLobby(story, '', [], 'series')).toBe(true);
  });
  it('matches any selected character while respecting other filters', () => {
    expect(
      matchesLobby(story, '4–5', ['animals'], 'night', ['fox', 'wolf']),
    ).toBe(true);
    expect(matchesLobby(story, '', [], '', ['fox'])).toBe(false);
    expect(matchesLobby(story, '', [], 'day', ['wolf'])).toBe(false);
  });
  it('does not infer categories or characters from specially named tags', () => {
    const legacy = {
      ...story,
      categories: undefined,
      characters: undefined,
      tags: ['Night Stories', 'Series: Wolf'],
    };
    expect(matchesLobby(legacy, '', [], 'night')).toBe(false);
    expect(matchesLobby(legacy, '', [], '', ['wolf'])).toBe(false);
    expect(matchesLobby(legacy, '', [], '')).toBe(true);
  });
  it('does not cap the 9+ age range', () => {
    expect(
      matchesLobby({ ...story, minAge: 10, maxAge: 12 }, '9+', [], ''),
    ).toBe(true);
  });
});
