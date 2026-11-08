import { metadata, guests, type Guest } from './storage';
import { api } from './api';
import {
  childSchema,
  quizAttemptSchema,
  type Child,
  type Family,
  type QuizAttempt,
} from '../../../packages/shared/src/family';
export type Parent = {
  id: string;
  email?: string;
  provider: 'google' | 'apple';
};
type Stored = Family & { dirtyChildren: string[]; pendingAttempts: string[] };
export const parentBase = () =>
  api.base.replace(/\/api\/v1\/?$/, '/api/parent');
export async function parentRequest<T>(
  path: string,
  data?: unknown,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${parentBase()}/${path}`, {
      signal: controller.signal,
      credentials: 'include',
      ...(data === undefined
        ? {}
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? 'Unable to connect.');
    return body;
  } finally {
    clearTimeout(timeout);
  }
}
export async function cachedParent(): Promise<Parent | null> {
  return JSON.parse((await metadata.get('parent-account')) ?? 'null');
}
export async function refreshParent() {
  const { parent } = await parentRequest<{ parent: Parent | null }>('session');
  await metadata.set('parent-account', JSON.stringify(parent));
  return parent;
}
export async function signOut() {
  await parentRequest('logout', {});
  await metadata.remove('parent-account');
}
const owner = async () => (await cachedParent())?.id ?? 'device';
const empty = (): Stored => ({
  children: [],
  attempts: [],
  dirtyChildren: [],
  pendingAttempts: [],
});
async function read(key: string): Promise<Stored> {
  return JSON.parse(
    (await metadata.get(`family:${key}`)) ?? JSON.stringify(empty()),
  );
}
async function write(key: string, state: Stored) {
  await metadata.set(`family:${key}`, JSON.stringify(state));
}
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(fn);
  queue = result.catch(() => {});
  return result;
}
export async function loadFamily(): Promise<Family> {
  await queue;
  return read(await owner());
}
export async function importDeviceFamily() {
  await serial(async () => {
    const parent = await cachedParent();
    if (!parent) throw new Error('Sign in first.');
    const local = await read('device'),
      account = await read(parent.id);
    for (const child of local.children) {
      if (!account.children.some((c) => c.id === child.id)) {
        account.children.push(child);
        account.dirtyChildren.push(child.id);
      }
    }
    for (const attempt of local.attempts) {
      if (!account.attempts.some((a) => a.id === attempt.id)) {
        account.attempts.push(attempt);
        account.pendingAttempts.push(attempt.id);
      }
    }
    account.activeChildId ??= local.activeChildId;
    await write(parent.id, account);
  });
  await syncFamily();
}
export async function saveChild(child: Child) {
  const valid = childSchema.parse(child);
  await serial(async () => {
    const key = await owner(),
      state = await read(key);
    const existing = state.children.find((c) => c.id === valid.id);
    state.children = [
      ...state.children.filter((c) => c.id !== valid.id),
      {
        ...valid,
        favorites: existing?.favorites ?? valid.favorites,
        readingProgress: existing?.readingProgress ?? valid.readingProgress,
        completedStories: existing?.completedStories ?? valid.completedStories,
      },
    ];
    state.activeChildId ??= valid.id;
    state.dirtyChildren = [...new Set([...state.dirtyChildren, valid.id])];
    await write(key, state);
  });
}
export async function selectChild(id: string) {
  await serial(async () => {
    const key = await owner(),
      state = await read(key);
    if (state.children.some((c) => c.id === id)) {
      state.activeChildId = id;
      await write(key, state);
    }
  });
}
export async function quizChild() {
  await queue;
  const key = await owner(),
    state = await read(key);
  return {
    owner: key,
    child: state.children.find((c) => c.id === state.activeChildId),
  };
}
function readerFor(child: Child): Guest {
  return {
    id: child.id,
    favorites: child.favorites ?? [],
    progress: child.readingProgress ?? {},
    completed: child.completedStories ?? [],
  };
}
export async function loadReader(): Promise<Guest> {
  const { child } = await quizChild();
  return child ? readerFor(child) : guests.load();
}
async function updateReader(
  change: (reader: Guest) => Guest,
  fallback: () => Promise<Guest>,
): Promise<Guest> {
  const result = await serial(async () => {
    const key = await owner(),
      state = await read(key);
    const child = state.children.find((c) => c.id === state.activeChildId);
    if (!child) return fallback();
    const reader = change(readerFor(child));
    child.favorites = reader.favorites;
    child.readingProgress = reader.progress;
    child.completedStories = reader.completed;
    state.dirtyChildren = [...new Set([...state.dirtyChildren, child.id])];
    await write(key, state);
    return reader;
  });
  void syncFamily().catch(() => {});
  return result;
}
export function toggleReaderFavorite(id: string) {
  return updateReader(
    (reader) => ({
      ...reader,
      favorites: reader.favorites.includes(id)
        ? reader.favorites.filter((f) => f !== id)
        : [...reader.favorites, id],
    }),
    () => guests.toggleFavorite(id),
  );
}
export function recordReading(
  id: string,
  language: string,
  page: number,
  completed: boolean,
) {
  return updateReader(
    (reader) => ({
      ...reader,
      progress: { ...reader.progress, [`${id}:${language}`]: page },
      completed:
        completed && !reader.completed.includes(id)
          ? [...reader.completed, id]
          : reader.completed,
    }),
    () => guests.recordProgress(id, language, page, completed),
  );
}
export async function recordAttempt(key: string, attempt: QuizAttempt) {
  const valid = quizAttemptSchema.parse(attempt);
  await serial(async () => {
    const state = await read(key);
    if (
      !state.children.some((c) => c.id === valid.childId) ||
      state.attempts.some((a) => a.id === valid.id)
    )
      return;
    state.attempts.push(valid);
    state.pendingAttempts.push(valid.id);
    await write(key, state);
  });
  if (key === (await owner())) void syncFamily().catch(() => {});
}
let syncing: Promise<void> | undefined;
export function syncFamily(): Promise<void> {
  if (syncing) return syncing;
  syncing = serial(async () => {
    const parent = await cachedParent();
    if (!parent) return;
    const key = parent.id,
      state = await read(key);
    for (const child of state.children.filter((c) =>
      state.dirtyChildren.includes(c.id),
    ))
      await parentRequest('child', child);
    for (const attempt of state.attempts.filter((a) =>
      state.pendingAttempts.includes(a.id),
    ))
      await parentRequest('attempt', attempt);
    const remote = await parentRequest<Family>('family');
    // Only a completed sync clears the pending queue. Retrying attempts is idempotent.
    state.children = remote.children;
    state.attempts = remote.attempts;
    state.dirtyChildren = [];
    state.pendingAttempts = [];
    if (!state.children.some((c) => c.id === state.activeChildId))
      state.activeChildId = state.children[0]?.id;
    await write(key, state);
  }).finally(() => {
    syncing = undefined;
  });
  return syncing;
}
