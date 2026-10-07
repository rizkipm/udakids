ALTER TABLE "articles" ADD COLUMN "image_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "articles" SET "image_ids" = jsonb_build_array("cover_image_id"::text) WHERE "cover_image_id" IS NOT NULL;
