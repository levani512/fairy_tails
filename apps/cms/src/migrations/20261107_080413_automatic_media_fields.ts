import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_media_kind" ADD VALUE 'audio' BEFORE 'narration';`);
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ALTER COLUMN "kind" SET DATA TYPE text;
  ALTER TABLE "media" ALTER COLUMN "kind" SET DEFAULT 'image'::text;
  DROP TYPE "public"."enum_media_kind";
  UPDATE "media" SET "kind" = 'narration' WHERE "kind" = 'audio';
  CREATE TYPE "public"."enum_media_kind" AS ENUM('image', 'video', 'narration', 'music', 'effect');
  ALTER TABLE "media" ALTER COLUMN "kind" SET DEFAULT 'image'::"public"."enum_media_kind";
  ALTER TABLE "media" ALTER COLUMN "kind" SET DATA TYPE "public"."enum_media_kind" USING "kind"::"public"."enum_media_kind";`);
}
