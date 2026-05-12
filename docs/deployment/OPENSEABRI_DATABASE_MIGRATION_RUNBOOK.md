# OpenSeaBri Database Migration Runbook

Status: required before production traffic.

This runbook is for the selected managed PostgreSQL database only. Do not run against production until the deployment operator has confirmed the target, backup, and rollback path.

## Required Environment Variables

```powershell
$env:OPENSEABRI_MODE = "production"
$env:OPENSEABRI_PERSISTENCE_ADAPTER = "database"
$env:SEABRI_DATABASE_URL = "<managed-postgres-url>"
```

`DATABASE_URL` may be used instead of `SEABRI_DATABASE_URL`. Never print the credential value in logs or evidence reports.

## Safety Notes

- Take a managed database snapshot before migration.
- Confirm the database is the OpenSeaBri production target.
- Keep live providers disabled during migration.
- Do not run traffic through the gateway until verification passes.
- `npm run db:migration-check` does not connect unless `OPENSEABRI_DB_CONNECT_CHECK=true`.

## Preflight

```powershell
npm run deployment:preflight
npm run db:migration-check
```

Expected without connection opt-in:

```text
[db:migration-check] database URL shape: PASS
[db:migration-check] DB connectivity/table verification skipped
[db:migration-check] PASS
```

To require DB configuration in a release shell:

```powershell
$env:OPENSEABRI_DB_REQUIRED = "true"
npm run db:migration-check
```

## Migration Command

After backup and target confirmation:

```powershell
npm run db:migrate
```

This runs Drizzle migrations from `db/migrations/`.

## Required Tables

The production schema must include:

- `user_profiles`
- `telemetry_events`
- `provider_validation_evidence`
- `sessions`
- `messages`

## Verification Queries

Run only after explicitly enabling safe DB verification:

```powershell
$env:OPENSEABRI_DB_CONNECT_CHECK = "true"
npm run db:migration-check
```

Manual SQL equivalent:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'user_profiles',
    'telemetry_events',
    'provider_validation_evidence',
    'sessions',
    'messages'
  )
order by table_name;
```

Expected: all five table names are present.

## Rollback Strategy

1. Stop production gateway traffic.
2. Keep `OPENSEABRI_CHANNELS_ENABLED=` and `OPENSEABRI_LIVE_PROVIDER_APPROVED=false`.
3. Restore the managed database snapshot if migration corrupts state.
4. Redeploy the previous gateway build if runtime compatibility fails.
5. Run `npm run db:migration-check` and `npm run check:production` before retrying.

## Before Traffic

- `npm run check:production` passes.
- `npm run db:migration-check` passes with `OPENSEABRI_DB_CONNECT_CHECK=true`.
- Provider readiness still shows live providers blocked unless specifically approved.
- Registry snapshot and provider readiness contain no secrets.
