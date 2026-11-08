import type { CollectionConfig } from 'payload';
const privateAccess = {
  read: () => false,
  create: () => false,
  update: () => false,
  delete: () => false,
};
const collection = (
  slug: string,
  fields: CollectionConfig['fields'],
): CollectionConfig => ({
  slug,
  access: privateAccess,
  admin: { hidden: true },
  fields,
});
export const ParentAccounts = collection('parent-accounts', [
  { name: 'identity', type: 'text', required: true, unique: true },
  { name: 'email', type: 'text' },
  {
    name: 'provider',
    type: 'select',
    options: ['google', 'apple'],
    required: true,
  },
]);
export const ParentSessions = collection('parent-sessions', [
  { name: 'tokenHash', type: 'text', required: true, unique: true },
  {
    name: 'parent',
    type: 'relationship',
    relationTo: 'parent-accounts',
    required: true,
    index: true,
  },
  { name: 'expiresAt', type: 'date', required: true },
]);
export const ChildProfiles = collection('child-profiles', [
  { name: 'ownerKey', type: 'text', required: true, unique: true },
  {
    name: 'parent',
    type: 'relationship',
    relationTo: 'parent-accounts',
    required: true,
    index: true,
  },
  { name: 'profile', type: 'json', required: true },
]);
export const QuizAttempts = collection('quiz-attempts', [
  { name: 'ownerKey', type: 'text', required: true, unique: true },
  {
    name: 'parent',
    type: 'relationship',
    relationTo: 'parent-accounts',
    required: true,
    index: true,
  },
  { name: 'attempt', type: 'json', required: true },
]);
