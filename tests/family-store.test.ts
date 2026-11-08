import { beforeEach, expect, it, vi } from 'vitest';
const data = vi.hoisted(() => new Map<string, string>());
vi.mock('../apps/client/src/storage', () => ({
  metadata: {
    get: async (key: string) => data.get(key) ?? null,
    set: async (key: string, value: string) => {
      data.set(key, value);
    },
    remove: async (key: string) => {
      data.delete(key);
    },
  },
}));
vi.mock('../apps/client/src/api', () => ({
  api: { base: 'http://localhost:3000/api/v1' },
}));
import {
  saveChild,
  selectChild,
  loadFamily,
  quizChild,
  recordAttempt,
  loadReader,
  toggleReaderFavorite,
  recordReading,
} from '../apps/client/src/family-store';
import type { Child, QuizAttempt } from '../packages/shared/src/family';
const child: Child = {
  id: 'aac7b3a4-aaca-4673-bef9-70d5b9c8aed3',
  name: 'Fox',
  icon: '🦊',
  age: 4,
  interests: ['Nature'],
  language: 'en',
};
const other = {
  ...child,
  id: '9339b8f8-fcb2-449c-980a-e50125afdb10',
  name: 'Bear',
};
beforeEach(() => data.clear());
it('restores each child’s own likes and reading progress after switching', async () => {
  await saveChild(child);
  await saveChild(other);
  await toggleReaderFavorite('pigs');
  await recordReading('pigs', 'en', 2, true);
  await selectChild(other.id);
  expect((await loadReader()).favorites).toEqual([]);
  expect((await loadReader()).progress).toEqual({});
  await toggleReaderFavorite('moon');
  await selectChild(child.id);
  await saveChild({ ...child, name: 'New name' });
  expect((await loadReader()).favorites).toEqual(['pigs']);
  expect((await loadReader()).progress['pigs:en']).toBe(2);
  expect((await loadReader()).completed).toEqual(['pigs']);
  await toggleReaderFavorite('pigs');
  await selectChild(other.id);
  expect((await loadReader()).favorites).toEqual(['moon']);
});
it('persists editing, active child switching, and separate child attempts', async () => {
  await saveChild(child);
  await saveChild(other);
  await selectChild(other.id);
  expect((await quizChild()).child?.name).toBe('Bear');
  const attempt: QuizAttempt = {
    id: 'c4f3a7c7-4266-40b5-b04a-145bba59897f',
    childId: other.id,
    storyId: '30',
    storyTitle: 'Test',
    language: 'en',
    completedAt: new Date().toISOString(),
    answers: [{ question: 'Why?' }],
  };
  await recordAttempt('device', attempt);
  await recordAttempt('device', attempt);
  await saveChild({ ...other, age: 6 });
  const family = await loadFamily();
  expect(family.children).toHaveLength(2);
  expect(family.attempts).toHaveLength(1);
  expect(family.attempts[0].childId).toBe(other.id);
  expect(family.children.find((c) => c.id === other.id)?.age).toBe(6);
});
it('keeps device profiles out of a different parent namespace', async () => {
  await saveChild(child);
  data.set('parent-account', JSON.stringify({ id: 'parent-2' }));
  expect((await loadFamily()).children).toEqual([]);
  data.delete('parent-account');
  expect((await loadFamily()).children[0].name).toBe('Fox');
});
