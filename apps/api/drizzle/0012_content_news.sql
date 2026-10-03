ALTER TABLE "parents" ADD COLUMN "news_opt_out_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- D-053: titik awal info materi baru. Skill yang sudah ada saat migrasi ini TIDAK diumumkan;
-- skill yang masuk setelahnya (seed/admin) diumumkan otomatis ke orang tua.
INSERT INTO "app_settings" ("key", "value") VALUES ('news', jsonb_build_object('enabled', true, 'lastAt', now())) ON CONFLICT ("key") DO NOTHING;
