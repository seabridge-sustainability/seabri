# OpenSeaBri GoDaddy DNS Guide

GoDaddy is the address book. It points names like `app.example.com` to the host that actually runs OpenSeaBri. GoDaddy shared hosting is not assumed to run the Node gateway, WebSockets, canvas WebSockets, or managed Postgres.

## Recommended Names

Replace `<domain>` with the real domain.

| Name | Purpose |
|---|---|
| `app.<domain>` | user-facing OpenSeaBri frontend |
| `api.<domain>` | gateway HTTP API |
| `ws.<domain>` | optional chat WebSocket alias |
| `canvas.<domain>` | optional canvas WebSocket alias |

## CNAME Setup

In GoDaddy DNS:

1. Open the domain.
2. Go to DNS records.
3. Add a `CNAME` for each subdomain.
4. Point the value to the hostname from Render, Railway, Fly, or the chosen host.

Example shape:

```text
Type: CNAME
Name: app
Value: <host-provided-frontend-name>

Type: CNAME
Name: api
Value: <host-provided-gateway-name>
```

Do not delete DNS records you do not understand. Screenshot/export the DNS zone before changing it.

## Apex / Root Domain Options

For `<domain>` without `app.`:

- Use the host's recommended apex/root setup.
- If the host provides `A` records, use those.
- If the host recommends `ALIAS`, `ANAME`, or forwarding, follow that provider's documented path.
- Safer first launch: keep root domain unchanged and use `app.<domain>` plus `api.<domain>`.

## SSL / TLS

The hosting provider should issue TLS certificates for the chosen hostnames. Do not cut traffic until:

```powershell
curl https://api.<domain>/health
```

returns a successful response without certificate warnings.

## DNS Propagation

DNS changes can take minutes to hours. During propagation, some machines may see the old target and some may see the new one.

Check records:

```powershell
nslookup app.<domain>
nslookup api.<domain>
```

Check health:

```powershell
curl https://api.<domain>/health
```

## CORS Setting

After the frontend hostname is chosen, set:

```text
OPENSEABRI_CORS_ORIGIN=https://app.<domain>
```

Do not use:

```text
OPENSEABRI_CORS_ORIGIN=*
```

## Rollback DNS

1. Put live providers back behind closed gates.
2. Restore previous DNS records from the screenshot/export.
3. Lower TTL before planned cutovers where possible.
4. Preserve host logs and smoke outputs.
