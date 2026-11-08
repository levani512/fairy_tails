import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "stories_translations" ADD COLUMN "thumbnail_id" integer;
  ALTER TABLE "stories" ADD COLUMN "default_thumbnail_id" integer;
  ALTER TABLE "_stories_v_version_translations" ADD COLUMN "thumbnail_id" integer;
  ALTER TABLE "_stories_v" ADD COLUMN "version_default_thumbnail_id" integer;
  ALTER TABLE "stories_translations" ADD CONSTRAINT "stories_translations_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories" ADD CONSTRAINT "stories_default_thumbnail_id_media_id_fk" FOREIGN KEY ("default_thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_version_translations" ADD CONSTRAINT "_stories_v_version_translations_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_version_default_thumbnail_id_media_id_fk" FOREIGN KEY ("version_default_thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "stories_translations_thumbnail_idx" ON "stories_translations" USING btree ("thumbnail_id");
  CREATE INDEX "stories_default_thumbnail_idx" ON "stories" USING btree ("default_thumbnail_id");
  CREATE INDEX "_stories_v_version_translations_thumbnail_idx" ON "_stories_v_version_translations" USING btree ("thumbnail_id");
  CREATE INDEX "_stories_v_version_version_default_thumbnail_idx" ON "_stories_v" USING btree ("version_default_thumbnail_id");`);
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "stories_translations" DROP CONSTRAINT "stories_translations_thumbnail_id_media_id_fk";
  
  ALTER TABLE "stories" DROP CONSTRAINT "stories_default_thumbnail_id_media_id_fk";
  
  ALTER TABLE "_stories_v_version_translations" DROP CONSTRAINT "_stories_v_version_translations_thumbnail_id_media_id_fk";
  
  ALTER TABLE "_stories_v" DROP CONSTRAINT "_stories_v_version_default_thumbnail_id_media_id_fk";
  
  DROP INDEX "stories_translations_thumbnail_idx";
  DROP INDEX "stories_default_thumbnail_idx";
  DROP INDEX "_stories_v_version_translations_thumbnail_idx";
  DROP INDEX "_stories_v_version_version_default_thumbnail_idx";
  ALTER TABLE "stories_translations" DROP COLUMN "thumbnail_id";
  ALTER TABLE "stories" DROP COLUMN "default_thumbnail_id";
  ALTER TABLE "_stories_v_version_translations" DROP COLUMN "thumbnail_id";
  ALTER TABLE "_stories_v" DROP COLUMN "version_default_thumbnail_id";`);
}
