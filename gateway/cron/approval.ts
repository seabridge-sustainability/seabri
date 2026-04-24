/**
 * gateway/cron/approval.ts
 *
 * HMAC approval-token factory for cron-triggered agent runs. The SeaBridgeAI
 * backend requires an X-OpenSeaBri-Run-Approval header on every
 * /agent/<name>/run POST — this module mints that token without
 * leaking the signing key into
 * the preset definitions themselves.
 *
 * The signing scheme mirrors the backend's _mint_approval_token helper:
 *   base64( HMAC-SHA256( OPENSEABRI_RUN_SECRET, JSON.stringify({agent, body}) ) )
 */

import { createHmac } from 'crypto'
import type { ApprovalTokenFactory } from './presets.js'

export class ApprovalSecretMissingError extends Error {
  constructor() {
    super('OPENSEABRI_RUN_SECRET is not set — cron presets cannot mint approval tokens')
    this.name = 'ApprovalSecretMissingError'
  }
}

/**
 * Build an ApprovalTokenFactory bound to the configured HMAC secret. Returns
 * null when the secret is unset so callers can decide whether to skip cron
 * boot (dev) or fail hard (prod).
 */
export function createApprovalTokenFactory(): ApprovalTokenFactory | null {
  const secret = process.env.OPENSEABRI_RUN_SECRET
  if (!secret) return null

  return (agent, body) => {
    const payload = JSON.stringify({ agent, body })
    return createHmac('sha256', secret).update(payload).digest('base64')
  }
}
