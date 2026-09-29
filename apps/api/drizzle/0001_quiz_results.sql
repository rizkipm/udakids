CREATE TABLE "quiz_results" (
	"child_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"best" integer NOT NULL,
	"last" integer NOT NULL,
	"passed" boolean NOT NULL,
	"attempts" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quiz_results_child_id_skill_id_pk" PRIMARY KEY("child_id","skill_id")
);
--> statement-breakpoint
ALTER TABLE "quiz_results" ADD CONSTRAINT "quiz_results_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;