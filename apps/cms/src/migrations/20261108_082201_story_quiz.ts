import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "stories_quiz_answers" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"correct" boolean DEFAULT false
  );
  
  CREATE TABLE "stories_quiz" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"explanation" varchar
  );
  
  CREATE TABLE "_stories_v_version_quiz_answers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"correct" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_stories_v_version_quiz" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"explanation" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "stories_quiz_answers" ADD CONSTRAINT "stories_quiz_answers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stories_quiz"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stories_quiz" ADD CONSTRAINT "stories_quiz_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v_version_quiz_answers" ADD CONSTRAINT "_stories_v_version_quiz_answers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_stories_v_version_quiz"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v_version_quiz" ADD CONSTRAINT "_stories_v_version_quiz_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_stories_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "stories_quiz_answers_order_idx" ON "stories_quiz_answers" USING btree ("_order");
  CREATE INDEX "stories_quiz_answers_parent_id_idx" ON "stories_quiz_answers" USING btree ("_parent_id");
  CREATE INDEX "stories_quiz_order_idx" ON "stories_quiz" USING btree ("_order");
  CREATE INDEX "stories_quiz_parent_id_idx" ON "stories_quiz" USING btree ("_parent_id");
  CREATE INDEX "_stories_v_version_quiz_answers_order_idx" ON "_stories_v_version_quiz_answers" USING btree ("_order");
  CREATE INDEX "_stories_v_version_quiz_answers_parent_id_idx" ON "_stories_v_version_quiz_answers" USING btree ("_parent_id");
  CREATE INDEX "_stories_v_version_quiz_order_idx" ON "_stories_v_version_quiz" USING btree ("_order");
  CREATE INDEX "_stories_v_version_quiz_parent_id_idx" ON "_stories_v_version_quiz" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "stories_quiz_answers" CASCADE;
  DROP TABLE "stories_quiz" CASCADE;
  DROP TABLE "_stories_v_version_quiz_answers" CASCADE;
  DROP TABLE "_stories_v_version_quiz" CASCADE;`)
}
