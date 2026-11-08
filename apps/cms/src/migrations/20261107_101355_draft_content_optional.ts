import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "stories_translations" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "stories_translations" ALTER COLUMN "description" DROP NOT NULL;
  ALTER TABLE "stories_pages_translations" ALTER COLUMN "text" DROP NOT NULL;
  ALTER TABLE "stories_pages_translations" ALTER COLUMN "narration_id" DROP NOT NULL;
  ALTER TABLE "stories_pages_translations" ALTER COLUMN "timings" DROP NOT NULL;
  ALTER TABLE "stories_pages" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "stories_pages" ALTER COLUMN "illustration_id" DROP NOT NULL;
  ALTER TABLE "stories" ALTER COLUMN "default_cover_id" DROP NOT NULL;
  ALTER TABLE "_stories_v_version_translations" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "_stories_v_version_translations" ALTER COLUMN "description" DROP NOT NULL;
  ALTER TABLE "_stories_v_version_pages_translations" ALTER COLUMN "text" DROP NOT NULL;
  ALTER TABLE "_stories_v_version_pages_translations" ALTER COLUMN "narration_id" DROP NOT NULL;
  ALTER TABLE "_stories_v_version_pages_translations" ALTER COLUMN "timings" DROP NOT NULL;
  ALTER TABLE "_stories_v_version_pages" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "_stories_v_version_pages" ALTER COLUMN "illustration_id" DROP NOT NULL;
  ALTER TABLE "_stories_v" ALTER COLUMN "version_default_cover_id" DROP NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "stories_translations" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "stories_translations" ALTER COLUMN "description" SET NOT NULL;
  ALTER TABLE "stories_pages_translations" ALTER COLUMN "text" SET NOT NULL;
  ALTER TABLE "stories_pages_translations" ALTER COLUMN "narration_id" SET NOT NULL;
  ALTER TABLE "stories_pages_translations" ALTER COLUMN "timings" SET NOT NULL;
  ALTER TABLE "stories_pages" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "stories_pages" ALTER COLUMN "illustration_id" SET NOT NULL;
  ALTER TABLE "stories" ALTER COLUMN "default_cover_id" SET NOT NULL;
  ALTER TABLE "_stories_v_version_translations" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "_stories_v_version_translations" ALTER COLUMN "description" SET NOT NULL;
  ALTER TABLE "_stories_v_version_pages_translations" ALTER COLUMN "text" SET NOT NULL;
  ALTER TABLE "_stories_v_version_pages_translations" ALTER COLUMN "narration_id" SET NOT NULL;
  ALTER TABLE "_stories_v_version_pages_translations" ALTER COLUMN "timings" SET NOT NULL;
  ALTER TABLE "_stories_v_version_pages" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "_stories_v_version_pages" ALTER COLUMN "illustration_id" SET NOT NULL;
  ALTER TABLE "_stories_v" ALTER COLUMN "version_default_cover_id" SET NOT NULL;`)
}
