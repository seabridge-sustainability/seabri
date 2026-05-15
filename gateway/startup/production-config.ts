import { validateChannelAllowlist, enabledChannelSet, type SupportedChannelId } from '../channels/enablement.js'
import { resolvePersistenceAdapter } from '../persistence/adapter.js'

export type StartupMode = 'dev' | 'staging' | 'production' | 'test'

export interface StartupValidationIssue {
  code: string
  message: string
}

export interface StartupValidationResult {
  mode: StartupMode
  ok: boolean
  errors: StartupValidationIssue[]
  warnings: StartupValidationIssue[]
  summary: Record<string, boolean | string | number>
}

type EnvLike = Record<string, string | undefined>

const CHANNEL_REQUIREMENTS: Record<SupportedChannelId, string[]> = {
  telegram: ['TELEGRAM_TOKEN'],
  whatsapp: ['WHATSAPP_PROVIDER', 'WHATSAPP_CLOUD_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN'],
  sms: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'],
  voice: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER', 'TWILIO_VOICE_WEBHOOK_URL', 'TWILIO_VOICE_TWIML_BASE_URL'],
  discord: ['DISCORD_BOT_TOKEN'],
  slack: ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN'],
  cli: [],
}

function bool(value: string | undefined): boolean {
  return value === 'true' || value === '1'
}

function value(env: EnvLike, key: string): string {
  return env[key] || ''
}

function issue(code: string, message: string): StartupValidationIssue {
  return { code, message }
}

export function resolveStartupMode(env: EnvLike = process.env): StartupMode {
  const explicit = (value(env, 'OPENSEABRI_MODE') || value(env, 'OPENSEABRI_DEPLOYMENT_MODE') || '').toLowerCase()
  if (explicit === 'production' || explicit === 'staging' || explicit === 'test' || explicit === 'dev') return explicit
  if (value(env, 'NODE_ENV') === 'production') return 'production'
  if (value(env, 'NODE_ENV') === 'test') return 'test'
  return 'dev'
}

export function hasProductionPersistence(env: EnvLike = process.env): boolean {
  return resolvePersistenceAdapter(env).productionSafe
}

function enabledChannelsFrom(env: EnvLike): string[] {
  const previous = process.env.OPENSEABRI_CHANNELS_ENABLED
  process.env.OPENSEABRI_CHANNELS_ENABLED = value(env, 'OPENSEABRI_CHANNELS_ENABLED')
  try {
    return [...enabledChannelSet()].sort()
  } finally {
    if (previous === undefined) delete process.env.OPENSEABRI_CHANNELS_ENABLED
    else process.env.OPENSEABRI_CHANNELS_ENABLED = previous
  }
}

export function validateStartupConfig(env: EnvLike = process.env): StartupValidationResult {
  const mode = resolveStartupMode(env)
  const errors: StartupValidationIssue[] = []
  const warnings: StartupValidationIssue[] = []
  const channelErrors = validateChannelAllowlist(value(env, 'OPENSEABRI_CHANNELS_ENABLED'))
  for (const error of channelErrors) errors.push(issue('unknown_channel', error))

  const enabledChannels = enabledChannelsFrom(env)
  const production = mode === 'production'
  const canvasEnabled = Boolean(value(env, 'OPENSEABRI_CANVAS_WS_PORT'))
  const liveApproved = bool(value(env, 'OPENSEABRI_LIVE_PROVIDER_APPROVED'))
  const persistence = resolvePersistenceAdapter(env)

  if (production) {
    for (const key of ['OPENSEABRI_API_KEY', 'SEABRI_WS_TOKEN', 'OPENSEABRI_CORS_ORIGIN', 'OPENSEABRI_RATE_LIMIT']) {
      if (!value(env, key)) errors.push(issue('missing_required_secret_or_config', `${key} is required in production.`))
    }
    if (canvasEnabled && !value(env, 'OPENSEABRI_CANVAS_WS_TOKEN')) {
      errors.push(issue('missing_canvas_token', 'OPENSEABRI_CANVAS_WS_TOKEN is required in production when canvas is enabled.'))
    }
    if (!hasProductionPersistence(env)) {
      errors.push(issue('missing_production_persistence', 'Set OPENSEABRI_PERSISTENCE_ADAPTER=database with SEABRI_DATABASE_URL or DATABASE_URL for production profile/session/telemetry persistence.'))
    }
    if (enabledChannels.some((id) => id !== 'cli') && !liveApproved) {
      errors.push(issue('live_provider_gate_closed', 'Production live channels require OPENSEABRI_LIVE_PROVIDER_APPROVED=true.'))
    }
  } else {
    if (!value(env, 'SEABRI_WS_TOKEN')) warnings.push(issue('missing_ws_token', 'SEABRI_WS_TOKEN is unset; WebSocket clients will be rejected.'))
    if (canvasEnabled && !value(env, 'OPENSEABRI_CANVAS_WS_TOKEN')) {
      warnings.push(issue('missing_canvas_token', 'Canvas WS token is unset; dev mode allows tokenless canvas only outside production.'))
    }
    if (mode === 'staging' && !hasProductionPersistence(env)) warnings.push(issue('file_persistence', 'No production persistence configured; file/in-memory fallback is staging/dev only.'))
  }

  for (const channel of enabledChannels) {
    const id = channel as SupportedChannelId
    const missing = (CHANNEL_REQUIREMENTS[id] ?? []).filter((key) => !value(env, key))
    if (missing.length > 0) {
      errors.push(issue('channel_missing_config', `${channel} is enabled but missing: ${missing.join(', ')}`))
    }
  }

  return {
    mode,
    ok: errors.length === 0,
    errors,
    warnings,
    summary: {
      mode,
      canvasEnabled,
      liveChannelsEnabled: enabledChannels.join(',') || '(none)',
      liveApproved,
      persistenceConfigured: hasProductionPersistence(env),
      persistenceAdapter: persistence.kind,
      rateLimitConfigured: Boolean(value(env, 'OPENSEABRI_RATE_LIMIT')),
    },
  }
}
