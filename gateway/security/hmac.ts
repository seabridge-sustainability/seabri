/**
 * HMAC run-approval helper — parity with manageesg-backend's dual-tier auth
 * on /api/v1/openseabri/* (X-OpenSeaBri-Key + X-OpenSeaBri-Run-Approval).
 *
 * For channel-initiated skill runs we build an HMAC-SHA256 over a canonical
 * string (channel|senderId|skillId|timestamp) using OPENSEABRI_RUN_APPROVAL_SECRET.
 * The resulting header lets the backend proxy distinguish operator-approved
 * runs from raw channel traffic without trusting the channel itself.
 *
 * Design notes:
 *  - Secret must be set server-side; if missing we return null and callers
 *    must treat the run as unapproved (fail-closed).
 *  - Timestamp skew tolerance is 5 min — wide enough for channel latency,
 *    narrow enough to bound replay.
 *  - No SDK dependency: uses node:crypto only.
 */

import { createHmac, timingSafeEqual } from 'crypto'

const SKEW_MS = 2 * 60 * 1000

function secret(): string {
  return process.env.OPENSEABRI_RUN_APPROVAL_SECRET || ''
}

export interface RunApprovalPayload {
  channel: string
  senderId: string
  skillId: string
  timestamp?: number
}

export interface RunApproval {
  header: string
  timestamp: number
}

function canonical(p: Required<RunApprovalPayload>): string {
  return `${p.channel}|${p.senderId}|${p.skillId}|${p.timestamp}`
}

/**
 * Build the X-OpenSeaBri-Run-Approval header value. Returns null when the
 * secret is not configured so callers can fail closed.
 */
export function signRunApproval(payload: RunApprovalPayload): RunApproval | null {
  const s = secret()
  if (!s) return null
  const timestamp = payload.timestamp ?? Date.now()
  const mac = createHmac('sha256', s)
    .update(canonical({ ...payload, timestamp }))
    .digest('hex')
  return { header: `t=${timestamp},v1=${mac}`, timestamp }
}

/**
 * Verify an incoming run-approval header. Returns true only when the secret
 * matches and the timestamp is within skew. Constant-time comparison.
 */
export function verifyRunApproval(
  header: string,
  payload: RunApprovalPayload
): boolean {
  const s = secret()
  if (!s) return false
  const parts = header.split(',').reduce<Record<string, string>>((acc, pair) => {
    const [k, v] = pair.split('=')
    if (k && v) acc[k.trim()] = v.trim()
    return acc
  }, {})
  const ts = Number(parts.t)
  const mac = parts.v1
  if (!Number.isFinite(ts) || !mac) return false
  if (Math.abs(Date.now() - ts) > SKEW_MS) return false

  const expected = createHmac('sha256', s)
    .update(canonical({ ...payload, timestamp: ts }))
    .digest('hex')
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(mac, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
