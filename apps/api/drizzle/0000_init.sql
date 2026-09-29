CREATE TYPE "public"."staff_role" AS ENUM('admin', 'facilitator');--> statement-breakpoint
CREATE TABLE "children" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"class_id" uuid,
	"nickname" text NOT NULL,
	"momo_color" text NOT NULL,
	"picture_pin_hash" text,
	"failed_pin_attempts" integer DEFAULT 0 NOT NULL,
	"pin_locked_until" timestamp with time zone,
	"report_token" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_active_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "children_report_token_unique" UNIQUE("report_token")
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facilitator_id" uuid,
	"code" text NOT NULL,
	"event_name" text NOT NULL,
	"world" integer,
	"starts_at" timestamp with time zone,
	"frozen" boolean DEFAULT false NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"child_id" uuid,
	"class_id" uuid,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"ts" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "level_progress" (
	"child_id" uuid NOT NULL,
	"level_id" text NOT NULL,
	"level_version" integer NOT NULL,
	"stars" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"hints" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "level_progress_child_id_level_id_level_version_pk" PRIMARY KEY("child_id","level_id","level_version")
);
--> statement-breakpoint
CREATE TABLE "levels" (
	"id" text PRIMARY KEY NOT NULL,
	"version" integer NOT NULL,
	"tier" text NOT NULL,
	"world" integer NOT NULL,
	"index" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "parent_contacts" (
	"child_id" uuid PRIMARY KEY NOT NULL,
	"contact" text,
	"consent_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"family_code" text NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parents_email_unique" UNIQUE("email"),
	CONSTRAINT "parents_family_code_unique" UNIQUE("family_code")
);
--> statement-breakpoint
CREATE TABLE "skill_catalogs" (
	"domain" text NOT NULL,
	"grade" text NOT NULL,
	"title" text NOT NULL,
	"categories" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skill_catalogs_domain_grade_pk" PRIMARY KEY("domain","grade")
);
--> statement-breakpoint
CREATE TABLE "skill_mastery" (
	"child_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"state" jsonb NOT NULL,
	"answered" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skill_mastery_child_id_skill_id_pk" PRIMARY KEY("child_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" text PRIMARY KEY NOT NULL,
	"version" integer NOT NULL,
	"domain" text NOT NULL,
	"grade" text NOT NULL,
	"category" text NOT NULL,
	"order" integer NOT NULL,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"template" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "staff_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" "staff_role" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_facilitator_id_staff_users_id_fk" FOREIGN KEY ("facilitator_id") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_progress" ADD CONSTRAINT "level_progress_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "levels" ADD CONSTRAINT "levels_updated_by_staff_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_contacts" ADD CONSTRAINT "parent_contacts_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_mastery" ADD CONSTRAINT "skill_mastery_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_updated_by_staff_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "children_parent_idx" ON "children" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "children_class_idx" ON "children" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "events_child_idx" ON "events" USING btree ("child_id","ts");--> statement-breakpoint
CREATE INDEX "events_type_idx" ON "events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "skills_catalog_idx" ON "skills" USING btree ("domain","grade","category","order");