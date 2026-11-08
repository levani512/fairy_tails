import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"active" boolean DEFAULT true,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "characters" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"image_id" integer NOT NULL,
  	"active" boolean DEFAULT true,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "stories_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "stories_rels" ADD COLUMN "characters_id" integer;
  ALTER TABLE "_stories_v_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "_stories_v_rels" ADD COLUMN "characters_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "characters_id" integer;
  ALTER TABLE "characters" ADD CONSTRAINT "characters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE INDEX "characters_image_idx" ON "characters" USING btree ("image_id");
  CREATE INDEX "characters_updated_at_idx" ON "characters" USING btree ("updated_at");
  CREATE INDEX "characters_created_at_idx" ON "characters" USING btree ("created_at");
  ALTER TABLE "stories_rels" ADD CONSTRAINT "stories_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stories_rels" ADD CONSTRAINT "stories_rels_characters_fk" FOREIGN KEY ("characters_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v_rels" ADD CONSTRAINT "_stories_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v_rels" ADD CONSTRAINT "_stories_v_rels_characters_fk" FOREIGN KEY ("characters_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_characters_fk" FOREIGN KEY ("characters_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "stories_rels_categories_id_idx" ON "stories_rels" USING btree ("categories_id");
  CREATE INDEX "stories_rels_characters_id_idx" ON "stories_rels" USING btree ("characters_id");
  CREATE INDEX "_stories_v_rels_categories_id_idx" ON "_stories_v_rels" USING btree ("categories_id");
  CREATE INDEX "_stories_v_rels_characters_id_idx" ON "_stories_v_rels" USING btree ("characters_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_characters_id_idx" ON "payload_locked_documents_rels" USING btree ("characters_id");
  INSERT INTO "categories" ("name", "order") VALUES ('Night Stories', 0), ('Day Stories', 1), ('Character Series', 2);`);
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "categories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "characters" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "characters" CASCADE;
  ALTER TABLE "stories_rels" DROP CONSTRAINT IF EXISTS "stories_rels_categories_fk";
  
  ALTER TABLE "stories_rels" DROP CONSTRAINT IF EXISTS "stories_rels_characters_fk";
  
  ALTER TABLE "_stories_v_rels" DROP CONSTRAINT IF EXISTS "_stories_v_rels_categories_fk";
  
  ALTER TABLE "_stories_v_rels" DROP CONSTRAINT IF EXISTS "_stories_v_rels_characters_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_categories_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_characters_fk";
  
  DROP INDEX "stories_rels_categories_id_idx";
  DROP INDEX "stories_rels_characters_id_idx";
  DROP INDEX "_stories_v_rels_categories_id_idx";
  DROP INDEX "_stories_v_rels_characters_id_idx";
  DROP INDEX "payload_locked_documents_rels_categories_id_idx";
  DROP INDEX "payload_locked_documents_rels_characters_id_idx";
  ALTER TABLE "stories_rels" DROP COLUMN "categories_id";
  ALTER TABLE "stories_rels" DROP COLUMN "characters_id";
  ALTER TABLE "_stories_v_rels" DROP COLUMN "categories_id";
  ALTER TABLE "_stories_v_rels" DROP COLUMN "characters_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "categories_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "characters_id";`);
}
