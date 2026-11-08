import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "stories_pages_translations" ADD COLUMN "voice_id" varchar;
  ALTER TABLE "stories_pages_translations" ADD COLUMN "sync_state" jsonb;
  ALTER TABLE "stories_pages" ADD COLUMN "default_narration_voice_id" varchar;
  ALTER TABLE "stories_pages" ADD COLUMN "default_narration_sync_state" jsonb;
  ALTER TABLE "_stories_v_version_pages_translations" ADD COLUMN "voice_id" varchar;
  ALTER TABLE "_stories_v_version_pages_translations" ADD COLUMN "sync_state" jsonb;
  ALTER TABLE "_stories_v_version_pages" ADD COLUMN "default_narration_voice_id" varchar;
  ALTER TABLE "_stories_v_version_pages" ADD COLUMN "default_narration_sync_state" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "stories_pages_translations" DROP COLUMN "voice_id";
  ALTER TABLE "stories_pages_translations" DROP COLUMN "sync_state";
  ALTER TABLE "stories_pages" DROP COLUMN "default_narration_voice_id";
  ALTER TABLE "stories_pages" DROP COLUMN "default_narration_sync_state";
  ALTER TABLE "_stories_v_version_pages_translations" DROP COLUMN "voice_id";
  ALTER TABLE "_stories_v_version_pages_translations" DROP COLUMN "sync_state";
  ALTER TABLE "_stories_v_version_pages" DROP COLUMN "default_narration_voice_id";
  ALTER TABLE "_stories_v_version_pages" DROP COLUMN "default_narration_sync_state";`)
}
