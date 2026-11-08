import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { s3Storage } from '@payloadcms/storage-s3';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import {
  Users,
  Media,
  Tags,
  Categories,
  Characters,
  BackgroundMusic,
  SoundEffects,
  Stories,
  Homes,
} from './collections';
import { narrationEndpoints } from './narration-endpoints';
import { ParentAccounts, ParentSessions, ChildProfiles, QuizAttempts } from './parent-collections';
const secret = process.env.PAYLOAD_SECRET;
if (!secret || secret.length < 32)
  throw new Error(
    'Set PAYLOAD_SECRET to a random value of at least 32 characters',
  );
export default buildConfig({
  secret,
  sharp,
  serverURL: process.env.SERVER_URL ?? 'http://localhost:3000',
  admin: {
    user: 'users',
    components: {
      afterNavLinks: ['/src/components/StoryPlatformLink#StoryPlatformLink'],
    },
    importMap: {
      baseDir: dirname(fileURLToPath(import.meta.url)) + '/..',
      importMapFile: dirname(fileURLToPath(import.meta.url)) + '/../app/(payload)/admin/importMap.ts',
    },
  },
  collections: [
    ParentAccounts, ParentSessions, ChildProfiles, QuizAttempts,
    Users,
    Media,
    Tags,
    Categories,
    Characters,
    BackgroundMusic,
    SoundEffects,
    Stories,
    Homes,
  ],
  endpoints: narrationEndpoints,
  localization: {
    locales: ['en', 'es', 'ka'],
    defaultLocale: 'en',
    fallback: false,
  },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL },
    push: process.env.NODE_ENV !== 'production',
  }),
  typescript: {
    outputFile: dirname(fileURLToPath(import.meta.url)) + '/payload-types.ts',
  },
  cors: [process.env.CLIENT_ORIGIN ?? 'http://localhost:8081'],
  csrf: [process.env.CLIENT_ORIGIN ?? 'http://localhost:8081'],
  plugins: process.env.S3_BUCKET
    ? [
        s3Storage({
          collections: { media: true },
          bucket: process.env.S3_BUCKET,
          config: {
            region: process.env.S3_REGION ?? 'auto',
            endpoint: process.env.S3_ENDPOINT,
            credentials: {
              accessKeyId: process.env.S3_ACCESS_KEY_ID!,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
            },
          },
        }),
      ]
    : [],
});
