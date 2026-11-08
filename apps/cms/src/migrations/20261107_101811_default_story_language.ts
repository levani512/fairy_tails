import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_stories_default_language" AS ENUM('en', 'es', 'ka');
  CREATE TYPE "public"."enum__stories_v_version_default_language" AS ENUM('en', 'es', 'ka');
  ALTER TABLE "stories" ADD COLUMN "default_language" "enum_stories_default_language" DEFAULT 'en' NOT NULL;
  ALTER TABLE "stories" ADD COLUMN "title" varchar;
  ALTER TABLE "stories" ADD COLUMN "description" varchar;
  ALTER TABLE "_stories_v" ADD COLUMN "version_default_language" "enum__stories_v_version_default_language" DEFAULT 'en' NOT NULL;
  ALTER TABLE "_stories_v" ADD COLUMN "version_title" varchar;
  ALTER TABLE "_stories_v" ADD COLUMN "version_description" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "stories" DROP COLUMN "default_language";
  ALTER TABLE "stories" DROP COLUMN "title";
  ALTER TABLE "stories" DROP COLUMN "description";
  ALTER TABLE "_stories_v" DROP COLUMN "version_default_language";
  ALTER TABLE "_stories_v" DROP COLUMN "version_title";
  ALTER TABLE "_stories_v" DROP COLUMN "version_description";
  DROP TYPE "public"."enum_stories_default_language";
  DROP TYPE "public"."enum__stories_v_version_default_language";`)
}
