# MCP Toolbox — OpenSeaBri Dev Guide

MCP Toolbox for Databases is a centrally managed dev/QA tool. This guide covers
setup for the OpenSeaBri PostgreSQL database (Drizzle ORM).

**Central clone:** `everything-claude-code/external/mcp-toolbox/`  
**Full integration doc:** `everything-claude-code/docs/mcp/mcp-toolbox.md`  
**Version:** 1.2.0

---

## What This Enables

Claude Code, Codex, and Gemini CLI can query OpenSeaBri's PostgreSQL database
during development for claim workflow debugging, schema validation, contractor
record inspection, and incident timeline analysis — without writing raw SQL scripts.

**Dev/QA tool only. No production coupling. No homeowner PII exposure.**

---

## Database Stack

| Component | Technology | MCP Toolbox Support |
|-----------|-----------|---------------------|
| Primary store | PostgreSQL | ✅ Built-in prebuilt + custom tools |
| ORM | Drizzle ORM | N/A — toolbox connects at wire level |
| Config | `drizzle.config.ts` | Schema at `db/schema.ts` |
| Env var | `SEABRI_DATABASE_URL` | Use dev URL only |

---

## Data Domains and PII Classification

| Table/Domain | PII Risk | MCP Access |
|-------------|---------|-----------|
| `properties` | Low — address only | ✅ Safe (dev) |
| `contractors` | Low — business info | ✅ Safe (business name + status only) |
| `claims` | Medium — links to homeowner | ✅ Status/workflow fields only |
| `incidents` | Medium — event data | ✅ Non-PII fields only |
| `incident_events` | Low — event log | ✅ Safe |
| `documents` | Medium — document references | ✅ State fields only |
| `homeowners` | **HIGH — PII** | BLOCKED until GDPR review |
| `insurance_policies` | **HIGH — financial PII** | BLOCKED until GDPR review |
| `homeowner_contacts` | **HIGH — PII** | BLOCKED until GDPR review |

GDPR review required before exposing any homeowner or insurance table.

---

## Setup (Local Dev)

### Step 1 — Create Read-Only PostgreSQL User

Against your local or dev Supabase/PostgreSQL instance:

```sql
-- Create read-only user
CREATE USER toolbox_ro WITH PASSWORD '<strong-random-password>';

-- Grant connection
GRANT CONNECT ON DATABASE openseabri_dev TO toolbox_ro;
GRANT USAGE ON SCHEMA public TO toolbox_ro;

-- Grant SELECT on safe tables only
GRANT SELECT ON
  properties,
  contractors,
  claims,
  incidents,
  incident_events,
  documents
TO toolbox_ro;

-- Explicitly deny homeowner PII tables
REVOKE ALL ON homeowners FROM toolbox_ro;
REVOKE ALL ON insurance_policies FROM toolbox_ro;
```

### Step 2 — Configure toolbox

```powershell
cd C:\Users\adelm\SeaBridgeAI\everything-claude-code\configs\mcp-toolbox
Copy-Item tools.dev.example.yaml tools.dev.yaml
# Edit tools.dev.yaml: fill in openseabri-postgres-dev source credentials
# port must be a quoted string: port: "5432"
# All tools require: authRequired: []
# Postgres tools use: statement: (not sql: or query:)
```

**YAML schema rules** (confirmed from Go source — these exact fields are required):

| Element | Correct field | Wrong (rejected) |
|---------|--------------|-----------------|
| Config format | Flat `---` separated docs, `kind:` on each | `sources: [...]` container |
| Postgres source | `port: "5432"` (quoted string) | `port: 5432` (int) |
| Postgres tool | `statement:` | `sql:` / `query:` |
| All tools | `authRequired: []` | omitting this field |

### Step 3 — Start toolbox

```powershell
# Full config (includes MongoDB + PostgreSQL toolsets)
.\everything-claude-code\scripts\start-mcp-toolbox-dev.ps1 -Toolset openseabri-qa

# PostgreSQL prebuilt mode (fastest)
$env:DATABASE_URL = "postgresql://toolbox_ro:<pass>@localhost:5432/openseabri_dev"
npx @toolbox-sdk/server --prebuilt=postgres --stdio
```

### Step 4 — Add to Claude Code

In `.mcp.json` (alongside existing entries):

```json
{
  "mcpServers": {
    "toolbox-postgres": {
      "command": "npx",
      "args": ["-y", "@toolbox-sdk/server", "--prebuilt=postgres", "--stdio"],
      "env": { "DATABASE_URL": "${SEABRI_DEV_DATABASE_URL}" }
    }
  }
}
```

---

## Schema Inspection Workflow

Once toolbox is running:

```
"List all tables in the OpenSeaBri dev database"
"Describe the columns in the claims table"
"Show me the claim status for claim ID <dev-uuid>"
"What contractors are currently approved?"
"List incident events for incident <dev-uuid>"
"Show me the documents table schema"
```

This is especially useful when debugging Drizzle migration mismatches — compare
what `db/schema.ts` declares vs what the live dev DB actually contains.

---

## Agent QA Checklist

- [ ] Toolbox connected to dev/local PostgreSQL, NOT production
- [ ] Read-only user confirmed (`GRANT SELECT` only)
- [ ] Homeowner and insurance tables excluded from toolbox access
- [ ] Drizzle schema (`db/schema.ts`) aligns with live table columns
- [ ] Claim workflow states match expected enum values
- [ ] Contractor approval status fields are consistent
- [ ] Document state machine transitions are traceable via incident_events

---

## Safe Query Templates

### Claim Workflow Debug

```sql
-- Via toolbox predefined tool: get-claim-status
-- Params: claim_id (UUID)
SELECT id, status, workflow_stage, created_at, updated_at
FROM claims WHERE id = $1 LIMIT 1;
```

### Contractor Validation

```sql
-- Via toolbox predefined tool: list-contractor-approvals
SELECT id, business_name, approval_status, approval_date
FROM contractors WHERE approval_status = 'approved'
ORDER BY approval_date DESC LIMIT 50;
```

### Incident Timeline

```sql
-- Via toolbox predefined tool: get-incident-timeline
SELECT id, event_type, occurred_at, description
FROM incident_events WHERE incident_id = $1
ORDER BY occurred_at ASC LIMIT 100;
```

---

## Safety Rules

1. Never expose `homeowners`, `insurance_policies`, or contact tables to MCP
2. Never commit `tools.dev.yaml` or `tools.staging.yaml`
3. Use read-only PostgreSQL user — never the Drizzle migration user
4. Toolbox does not replace Drizzle ORM in the application stack
5. Staging access requires explicit approval before configuration
6. Production: requires written approval from `adelmar@seabridgesustainability.com`

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| `permission denied for table homeowners` | Expected — toolbox_ro user is blocked |
| Column not found | Run schema migration first: `npx drizzle-kit push` |
| Connection refused | Start toolbox: `start-mcp-toolbox-dev.ps1 -Toolset openseabri-qa` |
| Table missing | Check `db/migrations/` for pending Drizzle migrations |
