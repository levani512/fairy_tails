import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_stories_cover_page_translations_language" AS ENUM('en', 'es', 'ka');
  CREATE TYPE "public"."enum_stories_end_page_translations_language" AS ENUM('en', 'es', 'ka');
  CREATE TYPE "public"."enum_stories_cover_page_transition" AS ENUM('fade', 'slide', 'none');
  CREATE TYPE "public"."enum_stories_end_page_transition" AS ENUM('fade', 'slide', 'none');
  CREATE TYPE "public"."enum__stories_v_version_cover_page_translations_language" AS ENUM('en', 'es', 'ka');
  CREATE TYPE "public"."enum__stories_v_version_end_page_translations_language" AS ENUM('en', 'es', 'ka');
  CREATE TYPE "public"."enum__stories_v_version_cover_page_transition" AS ENUM('fade', 'slide', 'none');
  CREATE TYPE "public"."enum__stories_v_version_end_page_transition" AS ENUM('fade', 'slide', 'none');
  CREATE TABLE "stories_cover_page_effects" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"asset_id" integer NOT NULL,
  	"at_ms" numeric DEFAULT 0,
  	"volume" numeric DEFAULT 0.5,
  	"animation" boolean DEFAULT true,
  	"duration_ms" numeric DEFAULT 0
  );
  
  CREATE TABLE "stories_cover_page_translations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"language" "enum_stories_cover_page_translations_language" DEFAULT 'en' NOT NULL,
  	"narration_id" integer,
  	"duration_ms" numeric DEFAULT 0,
  	"delay_ms" numeric DEFAULT 0,
  	"illustration_id" integer
  );
  
  CREATE TABLE "stories_end_page_effects" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"asset_id" integer NOT NULL,
  	"at_ms" numeric DEFAULT 0,
  	"volume" numeric DEFAULT 0.5,
  	"animation" boolean DEFAULT true,
  	"duration_ms" numeric DEFAULT 0
  );
  
  CREATE TABLE "stories_end_page_translations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"language" "enum_stories_end_page_translations_language" DEFAULT 'en' NOT NULL,
  	"narration_id" integer,
  	"duration_ms" numeric DEFAULT 0,
  	"delay_ms" numeric DEFAULT 0,
  	"illustration_id" integer
  );
  
  CREATE TABLE "_stories_v_version_cover_page_effects" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"asset_id" integer NOT NULL,
  	"at_ms" numeric DEFAULT 0,
  	"volume" numeric DEFAULT 0.5,
  	"animation" boolean DEFAULT true,
  	"duration_ms" numeric DEFAULT 0,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_stories_v_version_cover_page_translations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"language" "enum__stories_v_version_cover_page_translations_language" DEFAULT 'en' NOT NULL,
  	"narration_id" integer,
  	"duration_ms" numeric DEFAULT 0,
  	"delay_ms" numeric DEFAULT 0,
  	"illustration_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_stories_v_version_end_page_effects" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"asset_id" integer NOT NULL,
  	"at_ms" numeric DEFAULT 0,
  	"volume" numeric DEFAULT 0.5,
  	"animation" boolean DEFAULT true,
  	"duration_ms" numeric DEFAULT 0,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_stories_v_version_end_page_translations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"language" "enum__stories_v_version_end_page_translations_language" DEFAULT 'en' NOT NULL,
  	"narration_id" integer,
  	"duration_ms" numeric DEFAULT 0,
  	"delay_ms" numeric DEFAULT 0,
  	"illustration_id" integer,
  	"_uuid" varchar
  );
  
  ALTER TABLE "stories" ADD COLUMN "cover_page_illustration_id" integer;
  ALTER TABLE "stories" ADD COLUMN "cover_page_transition" "enum_stories_cover_page_transition" DEFAULT 'fade' NOT NULL;
  ALTER TABLE "stories" ADD COLUMN "cover_page_transition_ms" numeric DEFAULT 300;
  ALTER TABLE "stories" ADD COLUMN "cover_page_default_narration_narration_id" integer;
  ALTER TABLE "stories" ADD COLUMN "cover_page_default_narration_duration_ms" numeric DEFAULT 0;
  ALTER TABLE "stories" ADD COLUMN "cover_page_default_narration_delay_ms" numeric DEFAULT 0;
  ALTER TABLE "stories" ADD COLUMN "cover_page_music_asset_id" integer;
  ALTER TABLE "stories" ADD COLUMN "cover_page_music_volume" numeric DEFAULT 0.2;
  ALTER TABLE "stories" ADD COLUMN "cover_page_music_loop" boolean DEFAULT true;
  ALTER TABLE "stories" ADD COLUMN "cover_page_music_duck" boolean DEFAULT true;
  ALTER TABLE "stories" ADD COLUMN "cover_page_music_fade_ms" numeric DEFAULT 400;
  ALTER TABLE "stories" ADD COLUMN "end_page_illustration_id" integer;
  ALTER TABLE "stories" ADD COLUMN "end_page_transition" "enum_stories_end_page_transition" DEFAULT 'fade' NOT NULL;
  ALTER TABLE "stories" ADD COLUMN "end_page_transition_ms" numeric DEFAULT 300;
  ALTER TABLE "stories" ADD COLUMN "end_page_default_narration_narration_id" integer;
  ALTER TABLE "stories" ADD COLUMN "end_page_default_narration_duration_ms" numeric DEFAULT 0;
  ALTER TABLE "stories" ADD COLUMN "end_page_default_narration_delay_ms" numeric DEFAULT 0;
  ALTER TABLE "stories" ADD COLUMN "end_page_music_asset_id" integer;
  ALTER TABLE "stories" ADD COLUMN "end_page_music_volume" numeric DEFAULT 0.2;
  ALTER TABLE "stories" ADD COLUMN "end_page_music_loop" boolean DEFAULT true;
  ALTER TABLE "stories" ADD COLUMN "end_page_music_duck" boolean DEFAULT true;
  ALTER TABLE "stories" ADD COLUMN "end_page_music_fade_ms" numeric DEFAULT 400;
  ALTER TABLE "_stories_v" ADD COLUMN "version_cover_page_illustration_id" integer;
  ALTER TABLE "_stories_v" ADD COLUMN "version_cover_page_transition" "enum__stories_v_version_cover_page_transition" DEFAULT 'fade' NOT NULL;
  ALTER TABLE "_stories_v" ADD COLUMN "version_cover_page_transition_ms" numeric DEFAULT 300;
  ALTER TABLE "_stories_v" ADD COLUMN "version_cover_page_default_narration_narration_id" integer;
  ALTER TABLE "_stories_v" ADD COLUMN "version_cover_page_default_narration_duration_ms" numeric DEFAULT 0;
  ALTER TABLE "_stories_v" ADD COLUMN "version_cover_page_default_narration_delay_ms" numeric DEFAULT 0;
  ALTER TABLE "_stories_v" ADD COLUMN "version_cover_page_music_asset_id" integer;
  ALTER TABLE "_stories_v" ADD COLUMN "version_cover_page_music_volume" numeric DEFAULT 0.2;
  ALTER TABLE "_stories_v" ADD COLUMN "version_cover_page_music_loop" boolean DEFAULT true;
  ALTER TABLE "_stories_v" ADD COLUMN "version_cover_page_music_duck" boolean DEFAULT true;
  ALTER TABLE "_stories_v" ADD COLUMN "version_cover_page_music_fade_ms" numeric DEFAULT 400;
  ALTER TABLE "_stories_v" ADD COLUMN "version_end_page_illustration_id" integer;
  ALTER TABLE "_stories_v" ADD COLUMN "version_end_page_transition" "enum__stories_v_version_end_page_transition" DEFAULT 'fade' NOT NULL;
  ALTER TABLE "_stories_v" ADD COLUMN "version_end_page_transition_ms" numeric DEFAULT 300;
  ALTER TABLE "_stories_v" ADD COLUMN "version_end_page_default_narration_narration_id" integer;
  ALTER TABLE "_stories_v" ADD COLUMN "version_end_page_default_narration_duration_ms" numeric DEFAULT 0;
  ALTER TABLE "_stories_v" ADD COLUMN "version_end_page_default_narration_delay_ms" numeric DEFAULT 0;
  ALTER TABLE "_stories_v" ADD COLUMN "version_end_page_music_asset_id" integer;
  ALTER TABLE "_stories_v" ADD COLUMN "version_end_page_music_volume" numeric DEFAULT 0.2;
  ALTER TABLE "_stories_v" ADD COLUMN "version_end_page_music_loop" boolean DEFAULT true;
  ALTER TABLE "_stories_v" ADD COLUMN "version_end_page_music_duck" boolean DEFAULT true;
  ALTER TABLE "_stories_v" ADD COLUMN "version_end_page_music_fade_ms" numeric DEFAULT 400;
  ALTER TABLE "stories_cover_page_effects" ADD CONSTRAINT "stories_cover_page_effects_asset_id_media_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_cover_page_effects" ADD CONSTRAINT "stories_cover_page_effects_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stories_cover_page_translations" ADD CONSTRAINT "stories_cover_page_translations_narration_id_media_id_fk" FOREIGN KEY ("narration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_cover_page_translations" ADD CONSTRAINT "stories_cover_page_translations_illustration_id_media_id_fk" FOREIGN KEY ("illustration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_cover_page_translations" ADD CONSTRAINT "stories_cover_page_translations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stories_end_page_effects" ADD CONSTRAINT "stories_end_page_effects_asset_id_media_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_end_page_effects" ADD CONSTRAINT "stories_end_page_effects_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stories_end_page_translations" ADD CONSTRAINT "stories_end_page_translations_narration_id_media_id_fk" FOREIGN KEY ("narration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_end_page_translations" ADD CONSTRAINT "stories_end_page_translations_illustration_id_media_id_fk" FOREIGN KEY ("illustration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_end_page_translations" ADD CONSTRAINT "stories_end_page_translations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v_version_cover_page_effects" ADD CONSTRAINT "_stories_v_version_cover_page_effects_asset_id_media_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_version_cover_page_effects" ADD CONSTRAINT "_stories_v_version_cover_page_effects_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_stories_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v_version_cover_page_translations" ADD CONSTRAINT "_stories_v_version_cover_page_translations_narration_id_media_id_fk" FOREIGN KEY ("narration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_version_cover_page_translations" ADD CONSTRAINT "_stories_v_version_cover_page_translations_illustration_id_media_id_fk" FOREIGN KEY ("illustration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_version_cover_page_translations" ADD CONSTRAINT "_stories_v_version_cover_page_translations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_stories_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v_version_end_page_effects" ADD CONSTRAINT "_stories_v_version_end_page_effects_asset_id_media_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_version_end_page_effects" ADD CONSTRAINT "_stories_v_version_end_page_effects_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_stories_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v_version_end_page_translations" ADD CONSTRAINT "_stories_v_version_end_page_translations_narration_id_media_id_fk" FOREIGN KEY ("narration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_version_end_page_translations" ADD CONSTRAINT "_stories_v_version_end_page_translations_illustration_id_media_id_fk" FOREIGN KEY ("illustration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_version_end_page_translations" ADD CONSTRAINT "_stories_v_version_end_page_translations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_stories_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "stories_cover_page_effects_order_idx" ON "stories_cover_page_effects" USING btree ("_order");
  CREATE INDEX "stories_cover_page_effects_parent_id_idx" ON "stories_cover_page_effects" USING btree ("_parent_id");
  CREATE INDEX "stories_cover_page_effects_asset_idx" ON "stories_cover_page_effects" USING btree ("asset_id");
  CREATE INDEX "stories_cover_page_translations_order_idx" ON "stories_cover_page_translations" USING btree ("_order");
  CREATE INDEX "stories_cover_page_translations_parent_id_idx" ON "stories_cover_page_translations" USING btree ("_parent_id");
  CREATE INDEX "stories_cover_page_translations_narration_idx" ON "stories_cover_page_translations" USING btree ("narration_id");
  CREATE INDEX "stories_cover_page_translations_illustration_idx" ON "stories_cover_page_translations" USING btree ("illustration_id");
  CREATE INDEX "stories_end_page_effects_order_idx" ON "stories_end_page_effects" USING btree ("_order");
  CREATE INDEX "stories_end_page_effects_parent_id_idx" ON "stories_end_page_effects" USING btree ("_parent_id");
  CREATE INDEX "stories_end_page_effects_asset_idx" ON "stories_end_page_effects" USING btree ("asset_id");
  CREATE INDEX "stories_end_page_translations_order_idx" ON "stories_end_page_translations" USING btree ("_order");
  CREATE INDEX "stories_end_page_translations_parent_id_idx" ON "stories_end_page_translations" USING btree ("_parent_id");
  CREATE INDEX "stories_end_page_translations_narration_idx" ON "stories_end_page_translations" USING btree ("narration_id");
  CREATE INDEX "stories_end_page_translations_illustration_idx" ON "stories_end_page_translations" USING btree ("illustration_id");
  CREATE INDEX "_stories_v_version_cover_page_effects_order_idx" ON "_stories_v_version_cover_page_effects" USING btree ("_order");
  CREATE INDEX "_stories_v_version_cover_page_effects_parent_id_idx" ON "_stories_v_version_cover_page_effects" USING btree ("_parent_id");
  CREATE INDEX "_stories_v_version_cover_page_effects_asset_idx" ON "_stories_v_version_cover_page_effects" USING btree ("asset_id");
  CREATE INDEX "_stories_v_version_cover_page_translations_order_idx" ON "_stories_v_version_cover_page_translations" USING btree ("_order");
  CREATE INDEX "_stories_v_version_cover_page_translations_parent_id_idx" ON "_stories_v_version_cover_page_translations" USING btree ("_parent_id");
  CREATE INDEX "_stories_v_version_cover_page_translations_narration_idx" ON "_stories_v_version_cover_page_translations" USING btree ("narration_id");
  CREATE INDEX "_stories_v_version_cover_page_translations_illustration_idx" ON "_stories_v_version_cover_page_translations" USING btree ("illustration_id");
  CREATE INDEX "_stories_v_version_end_page_effects_order_idx" ON "_stories_v_version_end_page_effects" USING btree ("_order");
  CREATE INDEX "_stories_v_version_end_page_effects_parent_id_idx" ON "_stories_v_version_end_page_effects" USING btree ("_parent_id");
  CREATE INDEX "_stories_v_version_end_page_effects_asset_idx" ON "_stories_v_version_end_page_effects" USING btree ("asset_id");
  CREATE INDEX "_stories_v_version_end_page_translations_order_idx" ON "_stories_v_version_end_page_translations" USING btree ("_order");
  CREATE INDEX "_stories_v_version_end_page_translations_parent_id_idx" ON "_stories_v_version_end_page_translations" USING btree ("_parent_id");
  CREATE INDEX "_stories_v_version_end_page_translations_narration_idx" ON "_stories_v_version_end_page_translations" USING btree ("narration_id");
  CREATE INDEX "_stories_v_version_end_page_translations_illustration_idx" ON "_stories_v_version_end_page_translations" USING btree ("illustration_id");
  ALTER TABLE "stories" ADD CONSTRAINT "stories_cover_page_illustration_id_media_id_fk" FOREIGN KEY ("cover_page_illustration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories" ADD CONSTRAINT "stories_cover_page_default_narration_narration_id_media_id_fk" FOREIGN KEY ("cover_page_default_narration_narration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories" ADD CONSTRAINT "stories_cover_page_music_asset_id_media_id_fk" FOREIGN KEY ("cover_page_music_asset_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories" ADD CONSTRAINT "stories_end_page_illustration_id_media_id_fk" FOREIGN KEY ("end_page_illustration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories" ADD CONSTRAINT "stories_end_page_default_narration_narration_id_media_id_fk" FOREIGN KEY ("end_page_default_narration_narration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories" ADD CONSTRAINT "stories_end_page_music_asset_id_media_id_fk" FOREIGN KEY ("end_page_music_asset_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_version_cover_page_illustration_id_media_id_fk" FOREIGN KEY ("version_cover_page_illustration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_version_cover_page_default_narration_narration_id_media_id_fk" FOREIGN KEY ("version_cover_page_default_narration_narration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_version_cover_page_music_asset_id_media_id_fk" FOREIGN KEY ("version_cover_page_music_asset_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_version_end_page_illustration_id_media_id_fk" FOREIGN KEY ("version_end_page_illustration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_version_end_page_default_narration_narration_id_media_id_fk" FOREIGN KEY ("version_end_page_default_narration_narration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_version_end_page_music_asset_id_media_id_fk" FOREIGN KEY ("version_end_page_music_asset_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "stories_cover_page_cover_page_illustration_idx" ON "stories" USING btree ("cover_page_illustration_id");
  CREATE INDEX "stories_cover_page_default_narration_cover_page_default__idx" ON "stories" USING btree ("cover_page_default_narration_narration_id");
  CREATE INDEX "stories_cover_page_music_cover_page_music_asset_idx" ON "stories" USING btree ("cover_page_music_asset_id");
  CREATE INDEX "stories_end_page_end_page_illustration_idx" ON "stories" USING btree ("end_page_illustration_id");
  CREATE INDEX "stories_end_page_default_narration_end_page_default_narr_idx" ON "stories" USING btree ("end_page_default_narration_narration_id");
  CREATE INDEX "stories_end_page_music_end_page_music_asset_idx" ON "stories" USING btree ("end_page_music_asset_id");
  CREATE INDEX "_stories_v_version_cover_page_version_cover_page_illustr_idx" ON "_stories_v" USING btree ("version_cover_page_illustration_id");
  CREATE INDEX "_stories_v_version_cover_page_default_narration_version__idx" ON "_stories_v" USING btree ("version_cover_page_default_narration_narration_id");
  CREATE INDEX "_stories_v_version_cover_page_music_version_cover_page_m_idx" ON "_stories_v" USING btree ("version_cover_page_music_asset_id");
  CREATE INDEX "_stories_v_version_end_page_version_end_page_illustratio_idx" ON "_stories_v" USING btree ("version_end_page_illustration_id");
  CREATE INDEX "_stories_v_version_end_page_default_narration_version_en_idx" ON "_stories_v" USING btree ("version_end_page_default_narration_narration_id");
  CREATE INDEX "_stories_v_version_end_page_music_version_end_page_music_idx" ON "_stories_v" USING btree ("version_end_page_music_asset_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "stories_cover_page_effects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "stories_cover_page_translations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "stories_end_page_effects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "stories_end_page_translations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_stories_v_version_cover_page_effects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_stories_v_version_cover_page_translations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_stories_v_version_end_page_effects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_stories_v_version_end_page_translations" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "stories_cover_page_effects" CASCADE;
  DROP TABLE "stories_cover_page_translations" CASCADE;
  DROP TABLE "stories_end_page_effects" CASCADE;
  DROP TABLE "stories_end_page_translations" CASCADE;
  DROP TABLE "_stories_v_version_cover_page_effects" CASCADE;
  DROP TABLE "_stories_v_version_cover_page_translations" CASCADE;
  DROP TABLE "_stories_v_version_end_page_effects" CASCADE;
  DROP TABLE "_stories_v_version_end_page_translations" CASCADE;
  ALTER TABLE "stories" DROP CONSTRAINT "stories_cover_page_illustration_id_media_id_fk";
  
  ALTER TABLE "stories" DROP CONSTRAINT "stories_cover_page_default_narration_narration_id_media_id_fk";
  
  ALTER TABLE "stories" DROP CONSTRAINT "stories_cover_page_music_asset_id_media_id_fk";
  
  ALTER TABLE "stories" DROP CONSTRAINT "stories_end_page_illustration_id_media_id_fk";
  
  ALTER TABLE "stories" DROP CONSTRAINT "stories_end_page_default_narration_narration_id_media_id_fk";
  
  ALTER TABLE "stories" DROP CONSTRAINT "stories_end_page_music_asset_id_media_id_fk";
  
  ALTER TABLE "_stories_v" DROP CONSTRAINT "_stories_v_version_cover_page_illustration_id_media_id_fk";
  
  ALTER TABLE "_stories_v" DROP CONSTRAINT "_stories_v_version_cover_page_default_narration_narration_id_media_id_fk";
  
  ALTER TABLE "_stories_v" DROP CONSTRAINT "_stories_v_version_cover_page_music_asset_id_media_id_fk";
  
  ALTER TABLE "_stories_v" DROP CONSTRAINT "_stories_v_version_end_page_illustration_id_media_id_fk";
  
  ALTER TABLE "_stories_v" DROP CONSTRAINT "_stories_v_version_end_page_default_narration_narration_id_media_id_fk";
  
  ALTER TABLE "_stories_v" DROP CONSTRAINT "_stories_v_version_end_page_music_asset_id_media_id_fk";
  
  DROP INDEX "stories_cover_page_cover_page_illustration_idx";
  DROP INDEX "stories_cover_page_default_narration_cover_page_default__idx";
  DROP INDEX "stories_cover_page_music_cover_page_music_asset_idx";
  DROP INDEX "stories_end_page_end_page_illustration_idx";
  DROP INDEX "stories_end_page_default_narration_end_page_default_narr_idx";
  DROP INDEX "stories_end_page_music_end_page_music_asset_idx";
  DROP INDEX "_stories_v_version_cover_page_version_cover_page_illustr_idx";
  DROP INDEX "_stories_v_version_cover_page_default_narration_version__idx";
  DROP INDEX "_stories_v_version_cover_page_music_version_cover_page_m_idx";
  DROP INDEX "_stories_v_version_end_page_version_end_page_illustratio_idx";
  DROP INDEX "_stories_v_version_end_page_default_narration_version_en_idx";
  DROP INDEX "_stories_v_version_end_page_music_version_end_page_music_idx";
  ALTER TABLE "stories" DROP COLUMN "cover_page_illustration_id";
  ALTER TABLE "stories" DROP COLUMN "cover_page_transition";
  ALTER TABLE "stories" DROP COLUMN "cover_page_transition_ms";
  ALTER TABLE "stories" DROP COLUMN "cover_page_default_narration_narration_id";
  ALTER TABLE "stories" DROP COLUMN "cover_page_default_narration_duration_ms";
  ALTER TABLE "stories" DROP COLUMN "cover_page_default_narration_delay_ms";
  ALTER TABLE "stories" DROP COLUMN "cover_page_music_asset_id";
  ALTER TABLE "stories" DROP COLUMN "cover_page_music_volume";
  ALTER TABLE "stories" DROP COLUMN "cover_page_music_loop";
  ALTER TABLE "stories" DROP COLUMN "cover_page_music_duck";
  ALTER TABLE "stories" DROP COLUMN "cover_page_music_fade_ms";
  ALTER TABLE "stories" DROP COLUMN "end_page_illustration_id";
  ALTER TABLE "stories" DROP COLUMN "end_page_transition";
  ALTER TABLE "stories" DROP COLUMN "end_page_transition_ms";
  ALTER TABLE "stories" DROP COLUMN "end_page_default_narration_narration_id";
  ALTER TABLE "stories" DROP COLUMN "end_page_default_narration_duration_ms";
  ALTER TABLE "stories" DROP COLUMN "end_page_default_narration_delay_ms";
  ALTER TABLE "stories" DROP COLUMN "end_page_music_asset_id";
  ALTER TABLE "stories" DROP COLUMN "end_page_music_volume";
  ALTER TABLE "stories" DROP COLUMN "end_page_music_loop";
  ALTER TABLE "stories" DROP COLUMN "end_page_music_duck";
  ALTER TABLE "stories" DROP COLUMN "end_page_music_fade_ms";
  ALTER TABLE "_stories_v" DROP COLUMN "version_cover_page_illustration_id";
  ALTER TABLE "_stories_v" DROP COLUMN "version_cover_page_transition";
  ALTER TABLE "_stories_v" DROP COLUMN "version_cover_page_transition_ms";
  ALTER TABLE "_stories_v" DROP COLUMN "version_cover_page_default_narration_narration_id";
  ALTER TABLE "_stories_v" DROP COLUMN "version_cover_page_default_narration_duration_ms";
  ALTER TABLE "_stories_v" DROP COLUMN "version_cover_page_default_narration_delay_ms";
  ALTER TABLE "_stories_v" DROP COLUMN "version_cover_page_music_asset_id";
  ALTER TABLE "_stories_v" DROP COLUMN "version_cover_page_music_volume";
  ALTER TABLE "_stories_v" DROP COLUMN "version_cover_page_music_loop";
  ALTER TABLE "_stories_v" DROP COLUMN "version_cover_page_music_duck";
  ALTER TABLE "_stories_v" DROP COLUMN "version_cover_page_music_fade_ms";
  ALTER TABLE "_stories_v" DROP COLUMN "version_end_page_illustration_id";
  ALTER TABLE "_stories_v" DROP COLUMN "version_end_page_transition";
  ALTER TABLE "_stories_v" DROP COLUMN "version_end_page_transition_ms";
  ALTER TABLE "_stories_v" DROP COLUMN "version_end_page_default_narration_narration_id";
  ALTER TABLE "_stories_v" DROP COLUMN "version_end_page_default_narration_duration_ms";
  ALTER TABLE "_stories_v" DROP COLUMN "version_end_page_default_narration_delay_ms";
  ALTER TABLE "_stories_v" DROP COLUMN "version_end_page_music_asset_id";
  ALTER TABLE "_stories_v" DROP COLUMN "version_end_page_music_volume";
  ALTER TABLE "_stories_v" DROP COLUMN "version_end_page_music_loop";
  ALTER TABLE "_stories_v" DROP COLUMN "version_end_page_music_duck";
  ALTER TABLE "_stories_v" DROP COLUMN "version_end_page_music_fade_ms";
  DROP TYPE "public"."enum_stories_cover_page_translations_language";
  DROP TYPE "public"."enum_stories_end_page_translations_language";
  DROP TYPE "public"."enum_stories_cover_page_transition";
  DROP TYPE "public"."enum_stories_end_page_transition";
  DROP TYPE "public"."enum__stories_v_version_cover_page_translations_language";
  DROP TYPE "public"."enum__stories_v_version_end_page_translations_language";
  DROP TYPE "public"."enum__stories_v_version_cover_page_transition";
  DROP TYPE "public"."enum__stories_v_version_end_page_transition";`)
}
