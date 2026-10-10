CREATE TABLE "lab_progress" (
	"child_id" uuid NOT NULL,
	"lab_key" text NOT NULL,
	"part" text NOT NULL,
	"stars" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lab_progress_child_id_lab_key_part_pk" PRIMARY KEY("child_id","lab_key","part")
);
--> statement-breakpoint
ALTER TABLE "skill_catalogs" ADD COLUMN "lab" jsonb;--> statement-breakpoint
ALTER TABLE "lab_progress" ADD CONSTRAINT "lab_progress_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;