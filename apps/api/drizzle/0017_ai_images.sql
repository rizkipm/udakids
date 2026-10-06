CREATE TABLE "ai_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fingerprint" text NOT NULL,
	"kind" text NOT NULL,
	"subject" text NOT NULL,
	"label" text NOT NULL,
	"label_en" text,
	"theme" text,
	"variant" integer DEFAULT 1 NOT NULL,
	"prompt" text NOT NULL,
	"model" text NOT NULL,
	"quality" text NOT NULL,
	"size" text NOT NULL,
	"status" text DEFAULT 'review' NOT NULL,
	"mime" text NOT NULL,
	"data" "bytea" NOT NULL,
	"bytes" integer NOT NULL,
	"cost_usd" double precision DEFAULT 0 NOT NULL,
	"reference_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	CONSTRAINT "ai_images_fingerprint_unique" UNIQUE("fingerprint"),
	CONSTRAINT "ai_images_status_ck" CHECK ("ai_images"."status" in ('review', 'approved', 'rejected')),
	CONSTRAINT "ai_images_kind_ck" CHECK ("ai_images"."kind" in ('object', 'character', 'scene'))
);
--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"model" text,
	"image_id" uuid,
	"input_tokens" integer,
	"cached_tokens" integer,
	"output_tokens" integer,
	"cost_usd" double precision DEFAULT 0 NOT NULL,
	"ok" boolean NOT NULL,
	"detail" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_images" ADD CONSTRAINT "ai_images_created_by_staff_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_images" ADD CONSTRAINT "ai_images_reviewed_by_staff_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_image_id_ai_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."ai_images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_created_by_staff_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_images_subject_idx" ON "ai_images" USING btree ("subject","status");--> statement-breakpoint
CREATE INDEX "ai_usage_created_idx" ON "ai_usage" USING btree ("created_at");