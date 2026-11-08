import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ADD COLUMN "generated_poster_id" integer;
  ALTER TABLE "media" ADD COLUMN "original_filename" varchar;
  ALTER TABLE "media" ADD CONSTRAINT "media_generated_poster_id_media_id_fk" FOREIGN KEY ("generated_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "media_generated_poster_idx" ON "media" USING btree ("generated_poster_id");`);
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" DROP CONSTRAINT "media_generated_poster_id_media_id_fk";
  
  DROP INDEX "media_generated_poster_idx";
  ALTER TABLE "media" DROP COLUMN "generated_poster_id";
  ALTER TABLE "media" DROP COLUMN "original_filename";`);
}
