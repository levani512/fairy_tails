import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "stories" DROP COLUMN "content_version";
  ALTER TABLE "_stories_v" DROP COLUMN "version_content_version";`);
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "stories" ADD COLUMN "content_version" numeric DEFAULT 1;
  ALTER TABLE "_stories_v" ADD COLUMN "version_content_version" numeric DEFAULT 1;`);
}
