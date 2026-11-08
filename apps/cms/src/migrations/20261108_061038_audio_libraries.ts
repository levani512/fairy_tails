import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "background_music" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"audio_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sound_effects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"audio_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "background_music_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "sound_effects_id" integer;
  ALTER TABLE "background_music" ADD CONSTRAINT "background_music_audio_id_media_id_fk" FOREIGN KEY ("audio_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sound_effects" ADD CONSTRAINT "sound_effects_audio_id_media_id_fk" FOREIGN KEY ("audio_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "background_music_audio_idx" ON "background_music" USING btree ("audio_id");
  CREATE INDEX "background_music_updated_at_idx" ON "background_music" USING btree ("updated_at");
  CREATE INDEX "background_music_created_at_idx" ON "background_music" USING btree ("created_at");
  CREATE INDEX "sound_effects_audio_idx" ON "sound_effects" USING btree ("audio_id");
  CREATE INDEX "sound_effects_updated_at_idx" ON "sound_effects" USING btree ("updated_at");
  CREATE INDEX "sound_effects_created_at_idx" ON "sound_effects" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_background_music_fk" FOREIGN KEY ("background_music_id") REFERENCES "public"."background_music"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sound_effects_fk" FOREIGN KEY ("sound_effects_id") REFERENCES "public"."sound_effects"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_background_music_id_idx" ON "payload_locked_documents_rels" USING btree ("background_music_id");
  CREATE INDEX "payload_locked_documents_rels_sound_effects_id_idx" ON "payload_locked_documents_rels" USING btree ("sound_effects_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "background_music" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sound_effects" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "background_music" CASCADE;
  DROP TABLE "sound_effects" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_background_music_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_sound_effects_fk";
  
  DROP INDEX "payload_locked_documents_rels_background_music_id_idx";
  DROP INDEX "payload_locked_documents_rels_sound_effects_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "background_music_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "sound_effects_id";`)
}
