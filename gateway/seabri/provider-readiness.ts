import { mcpRegistry } from '../registries/mcp-registry.js'
import { recordTelemetryEvent } from '../telemetry/store.js'
import { isChannelExplicitlyEnabled } from '../channels/enablement.js'

export type ProviderId =
  | 'telegram'
  | 'whatsapp'
  | 'twilio_sms'
  | 'twilio_voice'
  | 'llm'
  | 'mcp_external_tools'
  | 'storage_database'

export interface ProviderReadinessStatus {
  provider: ProviderId
  enabled: boolean
  configured: boolean
  testMode: boolean
  liveModeAllowed: boolean
  missingConfigKeys: string[]
  lastValidationStatus?: 'not_run' | 'passed' | 'blocked' | 'failed'
  safeNextStep: string
  canRunLiveTest: boolean
}

export interface ProviderValidationResult {
  provider: ProviderId
  status: 'passed' | 'blocked' | 'failed'
  safeMessage: string
  readiness: ProviderReadinessStatus
}

const validationStatus = new Map<ProviderId, ProviderReadinessStatus['lastValidationStatus']>()

function env(name: string): string {
  return process.env[name] || ''
}

function hasAll(keys: string[]): boolean {
  return keys.every((key) => Boolean(env(key)))
}

function missing(keys: string[]): string[] {
  return keys.filter((key) => !env(key))
}

function liveProvidersAllowed(): boolean {
  return env('OPENSEABRI_LIVE_PROVIDER_TESTS_ENABLED') === 'true'
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

function allowedTestNumbers(): string[] {
  return (env('SEABRI_CALL_TEST_ALLOWED_NUMBERS') || '2698300869')
    .split(',')
    .map((n) => digitsOnly(n.trim()))
    .filter(Boolean)
}

function numberAllowed(value: string): boolean {
  const digits = digitsOnly(value)
  if (!digits) return false
  return allowedTestNumbers().some((n) => digits.endsWith(n) || n.endsWith(digits))
}

function status(
  provider: ProviderId,
  enabled: boolean,
  requiredKeys: string[],
  testMode: boolean,
  safeNextStep: string,
): ProviderReadinessStatus {
  const missingConfigKeys = missing(requiredKeys)
  const configured = requiredKeys.length === 0 ? enabled : missingConfigKeys.length === 0
  const liveModeAllowed = liveProvidersAllowed() && configured && enabled && !testMode
  return {
    provider,
    enabled,
    configured,
    testMode,
    liveModeAllowed,
    missingConfigKeys,
    lastValidationStatus: validationStatus.get(provider) ?? 'not_run',
    safeNextStep,
    canRunLiveTest: liveModeAllowed,
  }
}

export function getProviderReadiness(): ProviderReadinessStatus[] {
  const whatsappMode = env('WHATSAPP_PROVIDER').toLowerCase()
  const twilioKeys = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER']
  const storageKeys = ['OPENSEABRI_STORAGE_URL']
  const dbKeys = ['DATABASE_URL']

  return [
    status(
      'telegram',
      isChannelExplicitlyEnabled('telegram'),
      ['TELEGRAM_TOKEN'],
      env('OPENSEABRI_PROVIDER_TEST_MODE') !== 'false',
      'Set TELEGRAM_TOKEN and approved test chat, then run the live-provider validation plan.'
    ),
    status(
      'whatsapp',
      isChannelExplicitlyEnabled('whatsapp'),
      whatsappMode === 'cloud'
        ? ['WHATSAPP_PROVIDER', 'WHATSAPP_CLOUD_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_APP_SECRET']
        : ['WHATSAPP_PROVIDER'],
      whatsappMode !== 'cloud' || env('OPENSEABRI_PROVIDER_TEST_MODE') !== 'false',
      'Use cloud test/sandbox credentials and webhook signature validation before live traffic.'
    ),
    status(
      'twilio_sms',
      isChannelExplicitlyEnabled('sms') && env('SEABRI_MESSAGES_ENABLED') === 'true',
      twilioKeys,
      env('SEABRI_MESSAGE_TEST_MODE') !== 'false',
      'Keep SEABRI_MESSAGE_TEST_MODE=true and set approved test numbers before outbound SMS.'
    ),
    status(
      'twilio_voice',
      isChannelExplicitlyEnabled('voice') && (env('SEABRI_CALLS_ENABLED') === 'true' || env('OUTBOUND_CALLS_ENABLED') === 'true'),
      ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER', 'TWILIO_VOICE_WEBHOOK_URL', 'TWILIO_VOICE_TWIML_BASE_URL'],
      env('SEABRI_CALL_TEST_MODE') !== 'false',
      'Keep SEABRI_CALL_TEST_MODE=true and set approved test numbers before outbound calls.'
    ),
    status(
      'llm',
      Boolean(env('ANTHROPIC_API_KEY') || env('OPENAI_API_KEY') || env('DEEPSEEK_API_KEY') || env('LOCAL_INFERENCE_URL')),
      [],
      env('OPENSEABRI_LLM_LIVE_MODE') !== 'true',
      'Use local/mock mode or approved paid-provider smoke before enabling live LLM traffic.'
    ),
    status(
      'mcp_external_tools',
      mcpRegistry.list().length > 0,
      [],
      env('OPENSEABRI_MCP_LIVE_MODE') !== 'true',
      'Run MCP stdio smoke against allowlisted tools only.'
    ),
    status(
      'storage_database',
      Boolean(env('OPENSEABRI_STORAGE_URL') || env('DATABASE_URL') || env('REDIS_URL')),
      env('OPENSEABRI_STORAGE_URL') ? storageKeys : env('DATABASE_URL') ? dbKeys : [],
      env('OPENSEABRI_STORAGE_LIVE_MODE') !== 'true',
      'Configure managed storage/database through the staging secret store before persistence.'
    ),
  ]
}

export async function validateProviderReadiness(input: {
  provider?: string
  testTarget?: string
  liveTestRequested?: boolean
}): Promise<{ results: ProviderValidationResult[] }> {
  const all = getProviderReadiness()
  const selected = input.provider
    ? all.filter((s) => s.provider === input.provider)
    : all

  const results: ProviderValidationResult[] = []
  for (const readiness of selected) {
    let result: ProviderValidationResult
    const isTwilio = readiness.provider === 'twilio_sms' || readiness.provider === 'twilio_voice'
    if (input.testTarget && isTwilio && !numberAllowed(input.testTarget)) {
      result = {
        provider: readiness.provider,
        status: 'blocked',
        safeMessage: 'Test mode blocks non-whitelisted phone targets.',
        readiness,
      }
    } else if (input.liveTestRequested && !readiness.canRunLiveTest) {
      result = {
        provider: readiness.provider,
        status: 'blocked',
        safeMessage: 'Live validation is blocked until explicit live-provider gates are enabled.',
        readiness,
      }
    } else if (!readiness.configured) {
      result = {
        provider: readiness.provider,
        status: 'blocked',
        safeMessage: 'Provider configuration is incomplete.',
        readiness,
      }
    } else {
      result = {
        provider: readiness.provider,
        status: 'passed',
        safeMessage: 'Safe configuration validation passed. No live provider call was made.',
        readiness,
      }
    }

    validationStatus.set(readiness.provider, result.status)
    result.readiness.lastValidationStatus = result.status
    results.push(result)
  }

  await recordTelemetryEvent({
    type: 'provider_readiness_checked',
    data: {
      provider: input.provider ?? 'all',
      liveTestRequested: Boolean(input.liveTestRequested),
      results: results.map((r) => ({ provider: r.provider, status: r.status })),
    },
  })
  return { results }
}
