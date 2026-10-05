ALTER TABLE "email_verifications" ADD COLUMN "purpose" text DEFAULT 'verify' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_verifications" ADD COLUMN "new_email" text;--> statement-breakpoint
ALTER TABLE "parents" ADD COLUMN "password_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "parents" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;