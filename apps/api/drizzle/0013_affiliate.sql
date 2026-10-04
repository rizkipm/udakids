CREATE TABLE "action_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affiliate_accounts" (
	"parent_id" uuid PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"provider_name" text NOT NULL,
	"kind" text NOT NULL,
	"account_sealed" jsonb NOT NULL,
	"account_last4" text NOT NULL,
	"account_hash" text NOT NULL,
	"holder_name" text NOT NULL,
	"name_match" boolean NOT NULL,
	"status" text NOT NULL,
	"review_note" text,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"changed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affiliate_click_days" (
	"parent_id" uuid NOT NULL,
	"day" text NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "affiliate_click_days_parent_id_day_pk" PRIMARY KEY("parent_id","day")
);
--> statement-breakpoint
CREATE TABLE "affiliate_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid NOT NULL,
	"type" text NOT NULL,
	"state" text NOT NULL,
	"amount" integer NOT NULL,
	"base_amount" integer,
	"rate_bp" integer,
	"referee_id" uuid,
	"order_id" uuid,
	"payout_id" uuid,
	"available_at" timestamp with time zone,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affiliate_ledger_state_ck" CHECK ("affiliate_ledger"."state" in ('pending', 'available', 'void'))
);
--> statement-breakpoint
CREATE TABLE "affiliate_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"parent_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"provider_name" text NOT NULL,
	"kind" text NOT NULL,
	"account_sealed" jsonb NOT NULL,
	"account_last4" text NOT NULL,
	"holder_name" text NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"transfer_ref" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"cash_entry_id" uuid,
	CONSTRAINT "affiliate_payouts_number_unique" UNIQUE("number")
);
--> statement-breakpoint
ALTER TABLE "parents" ADD COLUMN "referral_code" text;--> statement-breakpoint
ALTER TABLE "parents" ADD COLUMN "referred_by" uuid;--> statement-breakpoint
ALTER TABLE "parents" ADD COLUMN "referred_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "parents" ADD COLUMN "signup_ip_hash" text;--> statement-breakpoint
ALTER TABLE "action_codes" ADD CONSTRAINT "action_codes_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_accounts" ADD CONSTRAINT "affiliate_accounts_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_accounts" ADD CONSTRAINT "affiliate_accounts_verified_by_staff_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_click_days" ADD CONSTRAINT "affiliate_click_days_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_ledger" ADD CONSTRAINT "affiliate_ledger_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_ledger" ADD CONSTRAINT "affiliate_ledger_referee_id_parents_id_fk" FOREIGN KEY ("referee_id") REFERENCES "public"."parents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_ledger" ADD CONSTRAINT "affiliate_ledger_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_ledger" ADD CONSTRAINT "affiliate_ledger_payout_id_affiliate_payouts_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."affiliate_payouts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_ledger" ADD CONSTRAINT "affiliate_ledger_created_by_staff_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_reviewed_by_staff_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_cash_entry_id_cash_entries_id_fk" FOREIGN KEY ("cash_entry_id") REFERENCES "public"."cash_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_codes_parent_idx" ON "action_codes" USING btree ("parent_id","purpose","created_at");--> statement-breakpoint
CREATE INDEX "affiliate_accounts_hash_idx" ON "affiliate_accounts" USING btree ("account_hash");--> statement-breakpoint
CREATE INDEX "affiliate_ledger_parent_idx" ON "affiliate_ledger" USING btree ("parent_id","created_at");--> statement-breakpoint
CREATE INDEX "affiliate_ledger_pending_idx" ON "affiliate_ledger" USING btree ("state","available_at");--> statement-breakpoint
CREATE UNIQUE INDEX "affiliate_ledger_bonus_uq" ON "affiliate_ledger" USING btree ("referee_id") WHERE "affiliate_ledger"."type" = 'signup_bonus';--> statement-breakpoint
CREATE UNIQUE INDEX "affiliate_ledger_commission_uq" ON "affiliate_ledger" USING btree ("order_id") WHERE "affiliate_ledger"."type" = 'commission';--> statement-breakpoint
CREATE UNIQUE INDEX "affiliate_ledger_payout_uq" ON "affiliate_ledger" USING btree ("payout_id","type") WHERE "affiliate_ledger"."payout_id" is not null;--> statement-breakpoint
CREATE INDEX "affiliate_payouts_parent_idx" ON "affiliate_payouts" USING btree ("parent_id","requested_at");--> statement-breakpoint
CREATE UNIQUE INDEX "affiliate_payouts_open_uq" ON "affiliate_payouts" USING btree ("parent_id") WHERE "affiliate_payouts"."status" = 'requested';--> statement-breakpoint
ALTER TABLE "parents" ADD CONSTRAINT "parents_referred_by_parents_id_fk" FOREIGN KEY ("referred_by") REFERENCES "public"."parents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "parents_referred_by_idx" ON "parents" USING btree ("referred_by");--> statement-breakpoint
ALTER TABLE "parents" ADD CONSTRAINT "parents_referral_code_unique" UNIQUE("referral_code");