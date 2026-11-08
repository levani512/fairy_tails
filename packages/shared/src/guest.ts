import { z } from 'zod';
const guestSchema = z.object({
  id: z.string(),
  favorites: z.array(z.string()),
  progress: z.record(z.string(), z.number().int().nonnegative()),
  completed: z.array(z.string()),
});
export type Guest = z.infer<typeof guestSchema>;
export interface GuestStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}
/** Serializes local profile mutations, including quick repeated taps. */
export class GuestRepository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private storage: GuestStorage,
    private createId: () => string,
  ) {}
  private async read(): Promise<Guest> {
    const raw = await this.storage.get('guest');
    if (raw) {
      try {
        return guestSchema.parse(JSON.parse(raw));
      } catch {
        await this.storage.set('guest-recovery', raw);
      }
    }
    const guest: Guest = {
      id: this.createId(),
      favorites: [],
      progress: {},
      completed: [],
    };
    await this.storage.set('guest', JSON.stringify(guest));
    return guest;
  }
  update(change: (guest: Guest) => Guest) {
    const next = this.queue.then(async () => {
      const guest = guestSchema.parse(change(await this.read()));
      await this.storage.set('guest', JSON.stringify(guest));
      return guest;
    });
    this.queue = next.catch(() => {});
    return next;
  }
  load() {
    return this.update((g) => g);
  }
  toggleFavorite(id: string) {
    return this.update((g) => ({
      ...g,
      favorites: g.favorites.includes(id)
        ? g.favorites.filter((x) => x !== id)
        : [...g.favorites, id],
    }));
  }
  recordProgress(
    id: string,
    language: string,
    page: number,
    completed = false,
  ) {
    return this.update((g) => ({
      ...g,
      progress: { ...g.progress, [`${id}:${language}`]: page },
      completed:
        completed && !g.completed.includes(id)
          ? [...g.completed, id]
          : g.completed,
    }));
  }
}
