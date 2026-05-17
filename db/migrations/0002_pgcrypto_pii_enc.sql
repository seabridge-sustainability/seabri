-- SEC-010: Enable pgcrypto extension and add encrypted columns for PII JSONB fields.
-- tool_input_enc replaces tool_input for sensitive tool call data.
-- trigger_config_enc replaces trigger_config for webhook/schedule config that may contain secrets.
-- Original columns are retained for backward-compatible migration; app layer encrypts on write.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "tool_input_enc" text;
--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "trigger_config_enc" text;
