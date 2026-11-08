import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en', 'es', 'ka');
  CREATE TYPE "public"."enum_media_kind" AS ENUM('image', 'video', 'narration', 'music', 'effect');
  CREATE TYPE "public"."enum_media_processing" AS ENUM('ready', 'pending', 'error');
  CREATE TYPE "public"."enum_stories_translations_language" AS ENUM('en', 'es', 'ka');
  CREATE TYPE "public"."enum_stories_pages_translations_language" AS ENUM('en', 'es', 'ka');
  CREATE TYPE "public"."enum_stories_pages_fit" AS ENUM('contain', 'cover');
  CREATE TYPE "public"."enum_stories_pages_layout" AS ENUM('below', 'overlay');
  CREATE TYPE "public"."enum_stories_pages_transition" AS ENUM('fade', 'slide', 'none');
  CREATE TYPE "public"."enum_stories_status" AS ENUM('draft', 'published', 'archived');
  CREATE TYPE "public"."enum_stories_access" AS ENUM('free', 'premium');
  CREATE TYPE "public"."enum__stories_v_version_translations_language" AS ENUM('en', 'es', 'ka');
  CREATE TYPE "public"."enum__stories_v_version_pages_translations_language" AS ENUM('en', 'es', 'ka');
  CREATE TYPE "public"."enum__stories_v_version_pages_fit" AS ENUM('contain', 'cover');
  CREATE TYPE "public"."enum__stories_v_version_pages_layout" AS ENUM('below', 'overlay');
  CREATE TYPE "public"."enum__stories_v_version_pages_transition" AS ENUM('fade', 'slide', 'none');
  CREATE TYPE "public"."enum__stories_v_version_status" AS ENUM('draft', 'published', 'archived');
  CREATE TYPE "public"."enum__stories_v_version_access" AS ENUM('free', 'premium');
  CREATE TYPE "public"."enum_homes_channels" AS ENUM('web', 'mobile', 'unity');
  CREATE TYPE "public"."enum_homes_entries_access" AS ENUM('free', 'premium');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"kind" "enum_media_kind" DEFAULT 'image' NOT NULL,
  	"hash" varchar,
  	"processing" "enum_media_processing" DEFAULT 'ready' NOT NULL,
  	"duration_ms" numeric DEFAULT 0,
  	"processing_error" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar
  );
  
  CREATE TABLE "tags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"identifier" varchar NOT NULL,
  	"icon_id" integer,
  	"active" boolean DEFAULT true,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tags_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "stories_translations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"language" "enum_stories_translations_language" DEFAULT 'en' NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"cover_id" integer
  );
  
  CREATE TABLE "stories_pages_effects" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"asset_id" integer NOT NULL,
  	"at_ms" numeric DEFAULT 0,
  	"volume" numeric DEFAULT 0.5,
  	"animation" boolean DEFAULT true,
  	"duration_ms" numeric DEFAULT 0
  );
  
  CREATE TABLE "stories_pages_translations" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"language" "enum_stories_pages_translations_language" DEFAULT 'en' NOT NULL,
  	"text" varchar NOT NULL,
  	"illustration_id" integer,
  	"video_id" integer,
  	"narration_id" integer NOT NULL,
  	"duration_ms" numeric DEFAULT 0,
  	"delay_ms" numeric DEFAULT 0,
  	"timings" jsonb NOT NULL
  );
  
  CREATE TABLE "stories_pages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"illustration_id" integer NOT NULL,
  	"video_id" integer,
  	"poster_id" integer,
  	"fit" "enum_stories_pages_fit" DEFAULT 'contain' NOT NULL,
  	"layout" "enum_stories_pages_layout" DEFAULT 'below' NOT NULL,
  	"transition" "enum_stories_pages_transition" DEFAULT 'fade' NOT NULL,
  	"transition_ms" numeric DEFAULT 300,
  	"music_asset_id" integer,
  	"music_volume" numeric DEFAULT 0.2,
  	"music_loop" boolean DEFAULT true,
  	"music_duck" boolean DEFAULT true,
  	"music_fade_ms" numeric DEFAULT 400
  );
  
  CREATE TABLE "stories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"status" "enum_stories_status" DEFAULT 'draft' NOT NULL,
  	"content_version" numeric DEFAULT 1,
  	"published_at" timestamp(3) with time zone,
  	"min_age" numeric DEFAULT 2,
  	"max_age" numeric DEFAULT 6,
  	"access" "enum_stories_access" DEFAULT 'free' NOT NULL,
  	"default_cover_id" integer NOT NULL,
  	"music_asset_id" integer,
  	"music_volume" numeric DEFAULT 0.2,
  	"music_loop" boolean DEFAULT true,
  	"music_duck" boolean DEFAULT true,
  	"music_fade_ms" numeric DEFAULT 400,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "stories_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" integer
  );
  
  CREATE TABLE "_stories_v_version_translations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"language" "enum__stories_v_version_translations_language" DEFAULT 'en' NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"cover_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_stories_v_version_pages_effects" (
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
  
  CREATE TABLE "_stories_v_version_pages_translations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"language" "enum__stories_v_version_pages_translations_language" DEFAULT 'en' NOT NULL,
  	"text" varchar NOT NULL,
  	"illustration_id" integer,
  	"video_id" integer,
  	"narration_id" integer NOT NULL,
  	"duration_ms" numeric DEFAULT 0,
  	"delay_ms" numeric DEFAULT 0,
  	"timings" jsonb NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_stories_v_version_pages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"illustration_id" integer NOT NULL,
  	"video_id" integer,
  	"poster_id" integer,
  	"fit" "enum__stories_v_version_pages_fit" DEFAULT 'contain' NOT NULL,
  	"layout" "enum__stories_v_version_pages_layout" DEFAULT 'below' NOT NULL,
  	"transition" "enum__stories_v_version_pages_transition" DEFAULT 'fade' NOT NULL,
  	"transition_ms" numeric DEFAULT 300,
  	"music_asset_id" integer,
  	"music_volume" numeric DEFAULT 0.2,
  	"music_loop" boolean DEFAULT true,
  	"music_duck" boolean DEFAULT true,
  	"music_fade_ms" numeric DEFAULT 400,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_stories_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar NOT NULL,
  	"version_slug" varchar NOT NULL,
  	"version_status" "enum__stories_v_version_status" DEFAULT 'draft' NOT NULL,
  	"version_content_version" numeric DEFAULT 1,
  	"version_published_at" timestamp(3) with time zone,
  	"version_min_age" numeric DEFAULT 2,
  	"version_max_age" numeric DEFAULT 6,
  	"version_access" "enum__stories_v_version_access" DEFAULT 'free' NOT NULL,
  	"version_default_cover_id" integer NOT NULL,
  	"version_music_asset_id" integer,
  	"version_music_volume" numeric DEFAULT 0.2,
  	"version_music_loop" boolean DEFAULT true,
  	"version_music_duck" boolean DEFAULT true,
  	"version_music_fade_ms" numeric DEFAULT 400,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_stories_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" integer
  );
  
  CREATE TABLE "homes_channels" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_homes_channels",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "homes_entries" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"story_id" integer NOT NULL,
  	"access" "enum_homes_entries_access",
  	"featured" boolean,
  	"order" numeric DEFAULT 0
  );
  
  CREATE TABLE "homes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"active" boolean DEFAULT true,
  	"fallback" boolean,
  	"priority" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "homes_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "homes_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"stories_id" integer
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"tags_id" integer,
  	"stories_id" integer,
  	"homes_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tags" ADD CONSTRAINT "tags_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tags_locales" ADD CONSTRAINT "tags_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stories_translations" ADD CONSTRAINT "stories_translations_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_translations" ADD CONSTRAINT "stories_translations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stories_pages_effects" ADD CONSTRAINT "stories_pages_effects_asset_id_media_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_pages_effects" ADD CONSTRAINT "stories_pages_effects_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stories_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stories_pages_translations" ADD CONSTRAINT "stories_pages_translations_illustration_id_media_id_fk" FOREIGN KEY ("illustration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_pages_translations" ADD CONSTRAINT "stories_pages_translations_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_pages_translations" ADD CONSTRAINT "stories_pages_translations_narration_id_media_id_fk" FOREIGN KEY ("narration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_pages_translations" ADD CONSTRAINT "stories_pages_translations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stories_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stories_pages" ADD CONSTRAINT "stories_pages_illustration_id_media_id_fk" FOREIGN KEY ("illustration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_pages" ADD CONSTRAINT "stories_pages_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_pages" ADD CONSTRAINT "stories_pages_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_pages" ADD CONSTRAINT "stories_pages_music_asset_id_media_id_fk" FOREIGN KEY ("music_asset_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_pages" ADD CONSTRAINT "stories_pages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stories" ADD CONSTRAINT "stories_default_cover_id_media_id_fk" FOREIGN KEY ("default_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories" ADD CONSTRAINT "stories_music_asset_id_media_id_fk" FOREIGN KEY ("music_asset_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_rels" ADD CONSTRAINT "stories_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stories_rels" ADD CONSTRAINT "stories_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v_version_translations" ADD CONSTRAINT "_stories_v_version_translations_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_version_translations" ADD CONSTRAINT "_stories_v_version_translations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_stories_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v_version_pages_effects" ADD CONSTRAINT "_stories_v_version_pages_effects_asset_id_media_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_version_pages_effects" ADD CONSTRAINT "_stories_v_version_pages_effects_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_stories_v_version_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v_version_pages_translations" ADD CONSTRAINT "_stories_v_version_pages_translations_illustration_id_media_id_fk" FOREIGN KEY ("illustration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_version_pages_translations" ADD CONSTRAINT "_stories_v_version_pages_translations_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_version_pages_translations" ADD CONSTRAINT "_stories_v_version_pages_translations_narration_id_media_id_fk" FOREIGN KEY ("narration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_version_pages_translations" ADD CONSTRAINT "_stories_v_version_pages_translations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_stories_v_version_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v_version_pages" ADD CONSTRAINT "_stories_v_version_pages_illustration_id_media_id_fk" FOREIGN KEY ("illustration_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_version_pages" ADD CONSTRAINT "_stories_v_version_pages_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_version_pages" ADD CONSTRAINT "_stories_v_version_pages_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_version_pages" ADD CONSTRAINT "_stories_v_version_pages_music_asset_id_media_id_fk" FOREIGN KEY ("music_asset_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_version_pages" ADD CONSTRAINT "_stories_v_version_pages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_stories_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_parent_id_stories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."stories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_version_default_cover_id_media_id_fk" FOREIGN KEY ("version_default_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_version_music_asset_id_media_id_fk" FOREIGN KEY ("version_music_asset_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_rels" ADD CONSTRAINT "_stories_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_stories_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v_rels" ADD CONSTRAINT "_stories_v_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "homes_channels" ADD CONSTRAINT "homes_channels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "homes_entries" ADD CONSTRAINT "homes_entries_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "homes_entries" ADD CONSTRAINT "homes_entries_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "homes_texts" ADD CONSTRAINT "homes_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "homes_rels" ADD CONSTRAINT "homes_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "homes_rels" ADD CONSTRAINT "homes_rels_stories_fk" FOREIGN KEY ("stories_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stories_fk" FOREIGN KEY ("stories_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_homes_fk" FOREIGN KEY ("homes_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE UNIQUE INDEX "tags_identifier_idx" ON "tags" USING btree ("identifier");
  CREATE INDEX "tags_icon_idx" ON "tags" USING btree ("icon_id");
  CREATE INDEX "tags_updated_at_idx" ON "tags" USING btree ("updated_at");
  CREATE INDEX "tags_created_at_idx" ON "tags" USING btree ("created_at");
  CREATE UNIQUE INDEX "tags_locales_locale_parent_id_unique" ON "tags_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "tags_locales_parent_id_idx" ON "tags_locales" USING btree ("_parent_id");
  CREATE INDEX "stories_translations_order_idx" ON "stories_translations" USING btree ("_order");
  CREATE INDEX "stories_translations_parent_id_idx" ON "stories_translations" USING btree ("_parent_id");
  CREATE INDEX "stories_translations_cover_idx" ON "stories_translations" USING btree ("cover_id");
  CREATE INDEX "stories_pages_effects_order_idx" ON "stories_pages_effects" USING btree ("_order");
  CREATE INDEX "stories_pages_effects_parent_id_idx" ON "stories_pages_effects" USING btree ("_parent_id");
  CREATE INDEX "stories_pages_effects_asset_idx" ON "stories_pages_effects" USING btree ("asset_id");
  CREATE INDEX "stories_pages_translations_order_idx" ON "stories_pages_translations" USING btree ("_order");
  CREATE INDEX "stories_pages_translations_parent_id_idx" ON "stories_pages_translations" USING btree ("_parent_id");
  CREATE INDEX "stories_pages_translations_illustration_idx" ON "stories_pages_translations" USING btree ("illustration_id");
  CREATE INDEX "stories_pages_translations_video_idx" ON "stories_pages_translations" USING btree ("video_id");
  CREATE INDEX "stories_pages_translations_narration_idx" ON "stories_pages_translations" USING btree ("narration_id");
  CREATE INDEX "stories_pages_order_idx" ON "stories_pages" USING btree ("_order");
  CREATE INDEX "stories_pages_parent_id_idx" ON "stories_pages" USING btree ("_parent_id");
  CREATE INDEX "stories_pages_illustration_idx" ON "stories_pages" USING btree ("illustration_id");
  CREATE INDEX "stories_pages_video_idx" ON "stories_pages" USING btree ("video_id");
  CREATE INDEX "stories_pages_poster_idx" ON "stories_pages" USING btree ("poster_id");
  CREATE INDEX "stories_pages_music_music_asset_idx" ON "stories_pages" USING btree ("music_asset_id");
  CREATE UNIQUE INDEX "stories_slug_idx" ON "stories" USING btree ("slug");
  CREATE INDEX "stories_default_cover_idx" ON "stories" USING btree ("default_cover_id");
  CREATE INDEX "stories_music_music_asset_idx" ON "stories" USING btree ("music_asset_id");
  CREATE INDEX "stories_updated_at_idx" ON "stories" USING btree ("updated_at");
  CREATE INDEX "stories_created_at_idx" ON "stories" USING btree ("created_at");
  CREATE INDEX "stories_rels_order_idx" ON "stories_rels" USING btree ("order");
  CREATE INDEX "stories_rels_parent_idx" ON "stories_rels" USING btree ("parent_id");
  CREATE INDEX "stories_rels_path_idx" ON "stories_rels" USING btree ("path");
  CREATE INDEX "stories_rels_tags_id_idx" ON "stories_rels" USING btree ("tags_id");
  CREATE INDEX "_stories_v_version_translations_order_idx" ON "_stories_v_version_translations" USING btree ("_order");
  CREATE INDEX "_stories_v_version_translations_parent_id_idx" ON "_stories_v_version_translations" USING btree ("_parent_id");
  CREATE INDEX "_stories_v_version_translations_cover_idx" ON "_stories_v_version_translations" USING btree ("cover_id");
  CREATE INDEX "_stories_v_version_pages_effects_order_idx" ON "_stories_v_version_pages_effects" USING btree ("_order");
  CREATE INDEX "_stories_v_version_pages_effects_parent_id_idx" ON "_stories_v_version_pages_effects" USING btree ("_parent_id");
  CREATE INDEX "_stories_v_version_pages_effects_asset_idx" ON "_stories_v_version_pages_effects" USING btree ("asset_id");
  CREATE INDEX "_stories_v_version_pages_translations_order_idx" ON "_stories_v_version_pages_translations" USING btree ("_order");
  CREATE INDEX "_stories_v_version_pages_translations_parent_id_idx" ON "_stories_v_version_pages_translations" USING btree ("_parent_id");
  CREATE INDEX "_stories_v_version_pages_translations_illustration_idx" ON "_stories_v_version_pages_translations" USING btree ("illustration_id");
  CREATE INDEX "_stories_v_version_pages_translations_video_idx" ON "_stories_v_version_pages_translations" USING btree ("video_id");
  CREATE INDEX "_stories_v_version_pages_translations_narration_idx" ON "_stories_v_version_pages_translations" USING btree ("narration_id");
  CREATE INDEX "_stories_v_version_pages_order_idx" ON "_stories_v_version_pages" USING btree ("_order");
  CREATE INDEX "_stories_v_version_pages_parent_id_idx" ON "_stories_v_version_pages" USING btree ("_parent_id");
  CREATE INDEX "_stories_v_version_pages_illustration_idx" ON "_stories_v_version_pages" USING btree ("illustration_id");
  CREATE INDEX "_stories_v_version_pages_video_idx" ON "_stories_v_version_pages" USING btree ("video_id");
  CREATE INDEX "_stories_v_version_pages_poster_idx" ON "_stories_v_version_pages" USING btree ("poster_id");
  CREATE INDEX "_stories_v_version_pages_music_music_asset_idx" ON "_stories_v_version_pages" USING btree ("music_asset_id");
  CREATE INDEX "_stories_v_parent_idx" ON "_stories_v" USING btree ("parent_id");
  CREATE INDEX "_stories_v_version_version_slug_idx" ON "_stories_v" USING btree ("version_slug");
  CREATE INDEX "_stories_v_version_version_default_cover_idx" ON "_stories_v" USING btree ("version_default_cover_id");
  CREATE INDEX "_stories_v_version_music_version_music_asset_idx" ON "_stories_v" USING btree ("version_music_asset_id");
  CREATE INDEX "_stories_v_version_version_updated_at_idx" ON "_stories_v" USING btree ("version_updated_at");
  CREATE INDEX "_stories_v_version_version_created_at_idx" ON "_stories_v" USING btree ("version_created_at");
  CREATE INDEX "_stories_v_created_at_idx" ON "_stories_v" USING btree ("created_at");
  CREATE INDEX "_stories_v_updated_at_idx" ON "_stories_v" USING btree ("updated_at");
  CREATE INDEX "_stories_v_rels_order_idx" ON "_stories_v_rels" USING btree ("order");
  CREATE INDEX "_stories_v_rels_parent_idx" ON "_stories_v_rels" USING btree ("parent_id");
  CREATE INDEX "_stories_v_rels_path_idx" ON "_stories_v_rels" USING btree ("path");
  CREATE INDEX "_stories_v_rels_tags_id_idx" ON "_stories_v_rels" USING btree ("tags_id");
  CREATE INDEX "homes_channels_order_idx" ON "homes_channels" USING btree ("order");
  CREATE INDEX "homes_channels_parent_idx" ON "homes_channels" USING btree ("parent_id");
  CREATE INDEX "homes_entries_order_idx" ON "homes_entries" USING btree ("_order");
  CREATE INDEX "homes_entries_parent_id_idx" ON "homes_entries" USING btree ("_parent_id");
  CREATE INDEX "homes_entries_story_idx" ON "homes_entries" USING btree ("story_id");
  CREATE INDEX "homes_updated_at_idx" ON "homes" USING btree ("updated_at");
  CREATE INDEX "homes_created_at_idx" ON "homes" USING btree ("created_at");
  CREATE INDEX "homes_texts_order_parent" ON "homes_texts" USING btree ("order","parent_id");
  CREATE INDEX "homes_rels_order_idx" ON "homes_rels" USING btree ("order");
  CREATE INDEX "homes_rels_parent_idx" ON "homes_rels" USING btree ("parent_id");
  CREATE INDEX "homes_rels_path_idx" ON "homes_rels" USING btree ("path");
  CREATE INDEX "homes_rels_stories_id_idx" ON "homes_rels" USING btree ("stories_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_tags_id_idx" ON "payload_locked_documents_rels" USING btree ("tags_id");
  CREATE INDEX "payload_locked_documents_rels_stories_id_idx" ON "payload_locked_documents_rels" USING btree ("stories_id");
  CREATE INDEX "payload_locked_documents_rels_homes_id_idx" ON "payload_locked_documents_rels" USING btree ("homes_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`);
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "tags" CASCADE;
  DROP TABLE "tags_locales" CASCADE;
  DROP TABLE "stories_translations" CASCADE;
  DROP TABLE "stories_pages_effects" CASCADE;
  DROP TABLE "stories_pages_translations" CASCADE;
  DROP TABLE "stories_pages" CASCADE;
  DROP TABLE "stories" CASCADE;
  DROP TABLE "stories_rels" CASCADE;
  DROP TABLE "_stories_v_version_translations" CASCADE;
  DROP TABLE "_stories_v_version_pages_effects" CASCADE;
  DROP TABLE "_stories_v_version_pages_translations" CASCADE;
  DROP TABLE "_stories_v_version_pages" CASCADE;
  DROP TABLE "_stories_v" CASCADE;
  DROP TABLE "_stories_v_rels" CASCADE;
  DROP TABLE "homes_channels" CASCADE;
  DROP TABLE "homes_entries" CASCADE;
  DROP TABLE "homes" CASCADE;
  DROP TABLE "homes_texts" CASCADE;
  DROP TABLE "homes_rels" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_media_kind";
  DROP TYPE "public"."enum_media_processing";
  DROP TYPE "public"."enum_stories_translations_language";
  DROP TYPE "public"."enum_stories_pages_translations_language";
  DROP TYPE "public"."enum_stories_pages_fit";
  DROP TYPE "public"."enum_stories_pages_layout";
  DROP TYPE "public"."enum_stories_pages_transition";
  DROP TYPE "public"."enum_stories_status";
  DROP TYPE "public"."enum_stories_access";
  DROP TYPE "public"."enum__stories_v_version_translations_language";
  DROP TYPE "public"."enum__stories_v_version_pages_translations_language";
  DROP TYPE "public"."enum__stories_v_version_pages_fit";
  DROP TYPE "public"."enum__stories_v_version_pages_layout";
  DROP TYPE "public"."enum__stories_v_version_pages_transition";
  DROP TYPE "public"."enum__stories_v_version_status";
  DROP TYPE "public"."enum__stories_v_version_access";
  DROP TYPE "public"."enum_homes_channels";
  DROP TYPE "public"."enum_homes_entries_access";`);
}
