-- D-041 (revisi): Premium dari admin hanya per anak. Premium keluarga dari admin yang masih berlaku
-- dipecah menjadi Premium per anak aktif (masa berlaku, catatan, dan pemberi sama), lalu diakhiri.
INSERT INTO "entitlements" ("child_id", "name", "scope", "books", "source", "note", "granted_by", "starts_at", "ends_at", "created_at")
SELECT c."id", e."name", e."scope", e."books", 'admin', e."note", e."granted_by", e."starts_at", e."ends_at", e."created_at"
FROM "entitlements" e
JOIN "children" c ON c."parent_id" = e."parent_id" AND c."active"
WHERE e."source" = 'admin' AND e."parent_id" IS NOT NULL AND e."child_id" IS NULL
  AND (e."ends_at" IS NULL OR e."ends_at" > now());--> statement-breakpoint
UPDATE "entitlements" SET "ends_at" = now()
WHERE "source" = 'admin' AND "parent_id" IS NOT NULL AND "child_id" IS NULL
  AND ("ends_at" IS NULL OR "ends_at" > now());
