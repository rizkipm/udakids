ALTER TABLE "children" ADD COLUMN "pin_lock_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "parents_email_lower_uq" ON "parents" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "staff_users_email_lower_uq" ON "staff_users" USING btree (lower("email"));