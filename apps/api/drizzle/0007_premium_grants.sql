ALTER TABLE "entitlements" ALTER COLUMN "parent_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "entitlements" ADD COLUMN "child_id" uuid;--> statement-breakpoint
ALTER TABLE "entitlements" ADD COLUMN "source" text DEFAULT 'purchase' NOT NULL;--> statement-breakpoint
ALTER TABLE "entitlements" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "entitlements" ADD COLUMN "granted_by" uuid;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_granted_by_staff_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entitlements_child_idx" ON "entitlements" USING btree ("child_id");--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_owner_ck" CHECK ("entitlements"."parent_id" is not null or "entitlements"."child_id" is not null);