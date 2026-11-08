import { it, expect } from 'vitest';
import { GuestRepository } from '../packages/shared/src/guest';
function fixture() {
  const data = new Map<string, string>();
  const storage = {
    get: async (k: string) => data.get(k) ?? null,
    set: async (k: string, v: string) => {
      data.set(k, v);
    },
  };
  return {
    data,
    storage,
    guest: new GuestRepository(storage, () => 'guest-one'),
  };
}
it('persists stable profile and favorites across repository restarts', async () => {
  const { guest, storage } = fixture();
  await guest.toggleFavorite('stable-story');
  const next = new GuestRepository(storage, () => 'different-id');
  expect(await next.load()).toMatchObject({
    id: 'guest-one',
    favorites: ['stable-story'],
  });
});
it('serializes rapid favorite changes without losing another story', async () => {
  const { guest } = fixture();
  await Promise.all([
    guest.toggleFavorite('a'),
    guest.toggleFavorite('b'),
    guest.toggleFavorite('a'),
  ]);
  expect((await guest.load()).favorites).toEqual(['b']);
});
it('keeps page progress language-specific and completion explicit', async () => {
  const { guest } = fixture();
  await guest.recordProgress('s', 'en', 2);
  await guest.recordProgress('s', 'es', 1);
  expect((await guest.load()).completed).toEqual([]);
  await guest.recordProgress('s', 'en', 4, true);
  await guest.recordProgress('s', 'en', 4, true);
  expect(await guest.load()).toMatchObject({
    progress: { 's:en': 4, 's:es': 1 },
    completed: ['s'],
  });
});
it('backs up corrupt storage before creating a recoverable guest', async () => {
  const { guest, data } = fixture();
  data.set('guest', 'bad json');
  expect((await guest.load()).id).toBe('guest-one');
  expect(data.get('guest-recovery')).toBe('bad json');
});
