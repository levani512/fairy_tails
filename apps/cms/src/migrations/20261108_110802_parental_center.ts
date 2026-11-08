import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_parent_accounts_provider" AS ENUM('google', 'apple');
  CREATE TABLE "parent_accounts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"identity" varchar NOT NULL,
  	"email" varchar,
  	"provider" "enum_parent_accounts_provider" NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "parent_sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"token_hash" varchar NOT NULL,
  	"parent_id" integer NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "child_profiles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"owner_key" varchar NOT NULL,
  	"parent_id" integer NOT NULL,
  	"profile" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "quiz_attempts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"owner_key" varchar NOT NULL,
  	"parent_id" integer NOT NULL,
  	"attempt" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "parent_accounts_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "parent_sessions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "child_profiles_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "quiz_attempts_id" integer;
  ALTER TABLE "parent_sessions" ADD CONSTRAINT "parent_sessions_parent_id_parent_accounts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parent_accounts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "child_profiles" ADD CONSTRAINT "child_profiles_parent_id_parent_accounts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parent_accounts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_parent_id_parent_accounts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parent_accounts"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "parent_accounts_identity_idx" ON "parent_accounts" USING btree ("identity");
  CREATE INDEX "parent_accounts_updated_at_idx" ON "parent_accounts" USING btree ("updated_at");
  CREATE INDEX "parent_accounts_created_at_idx" ON "parent_accounts" USING btree ("created_at");
  CREATE UNIQUE INDEX "parent_sessions_token_hash_idx" ON "parent_sessions" USING btree ("token_hash");
  CREATE INDEX "parent_sessions_parent_idx" ON "parent_sessions" USING btree ("parent_id");
  CREATE INDEX "parent_sessions_updated_at_idx" ON "parent_sessions" USING btree ("updated_at");
  CREATE INDEX "parent_sessions_created_at_idx" ON "parent_sessions" USING btree ("created_at");
  CREATE UNIQUE INDEX "child_profiles_owner_key_idx" ON "child_profiles" USING btree ("owner_key");
  CREATE INDEX "child_profiles_parent_idx" ON "child_profiles" USING btree ("parent_id");
  CREATE INDEX "child_profiles_updated_at_idx" ON "child_profiles" USING btree ("updated_at");
  CREATE INDEX "child_profiles_created_at_idx" ON "child_profiles" USING btree ("created_at");
  CREATE UNIQUE INDEX "quiz_attempts_owner_key_idx" ON "quiz_attempts" USING btree ("owner_key");
  CREATE INDEX "quiz_attempts_parent_idx" ON "quiz_attempts" USING btree ("parent_id");
  CREATE INDEX "quiz_attempts_updated_at_idx" ON "quiz_attempts" USING btree ("updated_at");
  CREATE INDEX "quiz_attempts_created_at_idx" ON "quiz_attempts" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_accounts_fk" FOREIGN KEY ("parent_accounts_id") REFERENCES "public"."parent_accounts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_sessions_fk" FOREIGN KEY ("parent_sessions_id") REFERENCES "public"."parent_sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_child_profiles_fk" FOREIGN KEY ("child_profiles_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_quiz_attempts_fk" FOREIGN KEY ("quiz_attempts_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_parent_accounts_id_idx" ON "payload_locked_documents_rels" USING btree ("parent_accounts_id");
  CREATE INDEX "payload_locked_documents_rels_parent_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("parent_sessions_id");
  CREATE INDEX "payload_locked_documents_rels_child_profiles_id_idx" ON "payload_locked_documents_rels" USING btree ("child_profiles_id");
  CREATE INDEX "payload_locked_documents_rels_quiz_attempts_id_idx" ON "payload_locked_documents_rels" USING btree ("quiz_attempts_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "parent_accounts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "parent_sessions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "child_profiles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quiz_attempts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "parent_accounts" CASCADE;
  DROP TABLE "parent_sessions" CASCADE;
  DROP TABLE "child_profiles" CASCADE;
  DROP TABLE "quiz_attempts" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_parent_accounts_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_parent_sessions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_child_profiles_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_quiz_attempts_fk";
  
  DROP INDEX "payload_locked_documents_rels_parent_accounts_id_idx";
  DROP INDEX "payload_locked_documents_rels_parent_sessions_id_idx";
  DROP INDEX "payload_locked_documents_rels_child_profiles_id_idx";
  DROP INDEX "payload_locked_documents_rels_quiz_attempts_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "parent_accounts_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "parent_sessions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "child_profiles_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "quiz_attempts_id";
  DROP TYPE "public"."enum_parent_accounts_provider";`)
}
