CREATE TABLE "provider_validation_evidence" (
	"validation_id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"mode" text NOT NULL,
	"validated_at" timestamp NOT NULL,
	"validated_by" text NOT NULL,
	"target_label" text,
	"result" text NOT NULL,
	"evidence_summary" text NOT NULL,
	"provider_reference_id" text,
	"notes" text,
	"expires_at" timestamp,
	"secrets_redacted" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"channel" text NOT NULL,
	"profile" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "provider_validation_evidence_provider_idx" ON "provider_validation_evidence" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "provider_validation_evidence_validated_at_idx" ON "provider_validation_evidence" USING btree ("validated_at");--> statement-breakpoint
CREATE INDEX "provider_validation_evidence_expires_at_idx" ON "provider_validation_evidence" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "telemetry_events_type_idx" ON "telemetry_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "telemetry_events_timestamp_idx" ON "telemetry_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "user_profiles_user_id_idx" ON "user_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_profiles_channel_idx" ON "user_profiles" USING btree ("channel");