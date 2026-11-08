import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "stories_pages" ADD COLUMN "default_narration_text" varchar;
  ALTER TABLE "stories_pages" ADD COLUMN "default_narration_narration_id" integer;
  ALTER TABLE "stories_pages" ADD COLUMN "default_narration_duration_ms" numeric DEFAULT 0;
  ALTER TABLE "stories_pages" ADD COLUMN "default_narration_delay_ms" numeric DEFAULT 0;
  ALTER TABLE "stories_pages" ADD COLUMN "default_narration_timings" jsonb;
  ALTER TABLE "stories_pages" ADD COLUMN "default_narration_illustration_id" integer;
  ALTER TABLE "stories_pages" ADD COLUMN "default_narration_video_id" integer;
  ALTER TABLE "_stories_v_version_pages" ADD COLUMN "default_narration_text" varchar;
  ALTER TABLE "_stories_v_version_pages" ADD COLUMN "default_narration_narration_id" integer;
  ALTER TABLE "_stories_v_version_pages" ADD COLUMN "default_narration_duration_ms" numeric DEFAULT 0;
  ALTER TABLE "_stories_v_version_pages" ADD COLUMN "default_narration_delay_ms" numeric DEFAULT 0;
  ALTER TABLE "_stories_v_version_pages" ADD COLUMN "default_narration_timings" jsonb;
  ALTER TABLE "_stories_v_version_pages" ADD COLUMN "default_narration_illustration_id" integer;
  ALTER TABLE "_stories_v_version_pages" ADD COLUMN "default_narration_video_id" integer;
  ALTER TABLE "stories_pages" ADD CONSTRAINT "stories_pages_default_narration_narration_id_media_id_fk" FOREIGN KEY ("default_narration_narration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_pages" ADD CONSTRAINT "stories_pages_default_narration_illustration_id_media_id_fk" FOREIGN KEY ("default_narration_illustration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_pages" ADD CONSTRAINT "stories_pages_default_narration_video_id_media_id_fk" FOREIGN KEY ("default_narration_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_version_pages" ADD CONSTRAINT "_stories_v_version_pages_default_narration_narration_id_media_id_fk" FOREIGN KEY ("default_narration_narration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_version_pages" ADD CONSTRAINT "_stories_v_version_pages_default_narration_illustration_id_media_id_fk" FOREIGN KEY ("default_narration_illustration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_version_pages" ADD CONSTRAINT "_stories_v_version_pages_default_narration_video_id_media_id_fk" FOREIGN KEY ("default_narration_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "stories_pages_default_narration_default_narration_narrat_idx" ON "stories_pages" USING btree ("default_narration_narration_id");
  CREATE INDEX "stories_pages_default_narration_default_narration_illust_idx" ON "stories_pages" USING btree ("default_narration_illustration_id");
  CREATE INDEX "stories_pages_default_narration_default_narration_video_idx" ON "stories_pages" USING btree ("default_narration_video_id");
  CREATE INDEX "_stories_v_version_pages_default_narration_default_narra_idx" ON "_stories_v_version_pages" USING btree ("default_narration_narration_id");
  CREATE INDEX "_stories_v_version_pages_default_narration_default_nar_1_idx" ON "_stories_v_version_pages" USING btree ("default_narration_illustration_id");
  CREATE INDEX "_stories_v_version_pages_default_narration_default_nar_2_idx" ON "_stories_v_version_pages" USING btree ("default_narration_video_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "stories_pages" DROP CONSTRAINT "stories_pages_default_narration_narration_id_media_id_fk";
  
  ALTER TABLE "stories_pages" DROP CONSTRAINT "stories_pages_default_narration_illustration_id_media_id_fk";
  
  ALTER TABLE "stories_pages" DROP CONSTRAINT "stories_pages_default_narration_video_id_media_id_fk";
  
  ALTER TABLE "_stories_v_version_pages" DROP CONSTRAINT "_stories_v_version_pages_default_narration_narration_id_media_id_fk";
  
  ALTER TABLE "_stories_v_version_pages" DROP CONSTRAINT "_stories_v_version_pages_default_narration_illustration_id_media_id_fk";
  
  ALTER TABLE "_stories_v_version_pages" DROP CONSTRAINT "_stories_v_version_pages_default_narration_video_id_media_id_fk";
  
  DROP INDEX "stories_pages_default_narration_default_narration_narrat_idx";
  DROP INDEX "stories_pages_default_narration_default_narration_illust_idx";
  DROP INDEX "stories_pages_default_narration_default_narration_video_idx";
  DROP INDEX "_stories_v_version_pages_default_narration_default_narra_idx";
  DROP INDEX "_stories_v_version_pages_default_narration_default_nar_1_idx";
  DROP INDEX "_stories_v_version_pages_default_narration_default_nar_2_idx";
  ALTER TABLE "stories_pages" DROP COLUMN "default_narration_text";
  ALTER TABLE "stories_pages" DROP COLUMN "default_narration_narration_id";
  ALTER TABLE "stories_pages" DROP COLUMN "default_narration_duration_ms";
  ALTER TABLE "stories_pages" DROP COLUMN "default_narration_delay_ms";
  ALTER TABLE "stories_pages" DROP COLUMN "default_narration_timings";
  ALTER TABLE "stories_pages" DROP COLUMN "default_narration_illustration_id";
  ALTER TABLE "stories_pages" DROP COLUMN "default_narration_video_id";
  ALTER TABLE "_stories_v_version_pages" DROP COLUMN "default_narration_text";
  ALTER TABLE "_stories_v_version_pages" DROP COLUMN "default_narration_narration_id";
  ALTER TABLE "_stories_v_version_pages" DROP COLUMN "default_narration_duration_ms";
  ALTER TABLE "_stories_v_version_pages" DROP COLUMN "default_narration_delay_ms";
  ALTER TABLE "_stories_v_version_pages" DROP COLUMN "default_narration_timings";
  ALTER TABLE "_stories_v_version_pages" DROP COLUMN "default_narration_illustration_id";
  ALTER TABLE "_stories_v_version_pages" DROP COLUMN "default_narration_video_id";`)
}
