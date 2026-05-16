// Provider approval readiness check — does NOT call any live provider.
// Run: npx tsx scripts/approve-provider.ts <provider>
// Providers: telegram, whatsapp, sms, voice, vision

type ProviderDef = {
  required: string[]
  channelEnvKey: string
  testTarget: string
  docs: string
}

const PROVIDERS: Record<string, ProviderDef> = {
  telegram: {
    required: ['TELEGRAM_TOKEN', 'OPENSEABRI_TELEGRAM_ALLOWLIST'],
    channelEnvKey: 'telegram',
    testTarget: [
      'Set OPENSEABRI_TELEGRAM_ALLOWLIST to your personal test chat ID (numbers only).',
      'Send /start to the bot from that account.',
      'Verify a safe reply arrives. Do not add public chats to the allowlist.',
    ].join('\n    '),
    docs: 'docs/testing/OPENSEABRI_LIVE_PROVIDER_VALIDATION_PLAN.md',
  },
  whatsapp: {
    required: ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'OPENSEABRI_WHATSAPP_ALLOWLIST'],
    channelEnvKey: 'whatsapp',
    testTarget: [
      'Set OPENSEABRI_WHATSAPP_ALLOWLIST to your personal WhatsApp number in E.164 format.',
      'Send a test message from that number.',
      'Verify a safe reply arrives. Do not add unverified numbers.',
    ].join('\n    '),
    docs: 'docs/testing/OPENSEABRI_LIVE_PROVIDER_VALIDATION_PLAN.md',
  },
  sms: {
    required: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER', 'OPENSEABRI_SMS_ALLOWLIST'],
    channelEnvKey: 'sms',
    testTarget: [
      'Set OPENSEABRI_SMS_ALLOWLIST to your personal phone number in E.164 format.',
      'Send a test SMS from that number to your Twilio number.',
      'Verify a safe reply arrives. Do not add unverified numbers.',
    ].join('\n    '),
    docs: 'docs/testing/OPENSEABRI_LIVE_PROVIDER_VALIDATION_PLAN.md',
  },
  voice: {
    required: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
    channelEnvKey: 'voice',
    testTarget: [
      'Configure a Twilio test call to a verified test number only.',
      'Do not call real users or numbers outside your test allowlist.',
      'Verify TwiML response is returned without errors.',
    ].join('\n    '),
    docs: 'docs/testing/OPENSEABRI_LIVE_PROVIDER_VALIDATION_PLAN.md',
  },
  vision: {
    required: ['OPENSEABRI_VISION_PROVIDER', 'OPENSEABRI_VISION_API_KEY'],
    channelEnvKey: 'vision',
    testTarget: [
      'Test with a non-private, non-PII image from your own files.',
      'Confirm the response is safe and contains no raw provider errors.',
      'Do not test with images containing personal data.',
    ].join('\n    '),
    docs: 'docs/testing/OPENSEABRI_LIVE_PROVIDER_VALIDATION_PLAN.md',
  },
}

function line(text: string): void {
  console.log(`[approve] ${text}`)
}

const providerName = process.argv[2]?.toLowerCase()

if (!providerName || !PROVIDERS[providerName]) {
  if (providerName && !PROVIDERS[providerName]) {
    line(`UNKNOWN provider: ${providerName}`)
  }
  line('Available providers:')
  for (const [name, def] of Object.entries(PROVIDERS)) {
    line(`  ${name}: requires ${def.required.join(', ')}`)
  }
  line('Usage: npx tsx scripts/approve-provider.ts <provider>')
  process.exit(0)
}

const provider = PROVIDERS[providerName]
line(`Checking readiness for provider: ${providerName}`)
console.log()

let allPresent = true
for (const varName of provider.required) {
  const present = Boolean(process.env[varName])
  if (present) {
    line(`PRESENT: ${varName}`)
  } else {
    line(`MISSING: ${varName}`)
    allPresent = false
  }
}

console.log()

const gateOpen = (process.env.OPENSEABRI_LIVE_PROVIDER_APPROVED || '').toLowerCase() === 'true'
if (gateOpen) {
  line('WARNING: OPENSEABRI_LIVE_PROVIDER_APPROVED is already true globally.')
  line('         Prefer per-provider allowlists over the global gate.')
}

if (!allPresent) {
  line('FAIL: Set all MISSING vars before running this check again.')
  line(`Docs: ${provider.docs}`)
  process.exit(1)
}

line('All required vars present.')
console.log()
line('Next manual step:')
line(`    ${provider.testTarget}`)
console.log()
line(`To enable the ${providerName} channel, add to OPENSEABRI_CHANNELS_ENABLED:`)
line(`    OPENSEABRI_CHANNELS_ENABLED=${providerName}`)
console.log()
line('WARNING: Do not set OPENSEABRI_LIVE_PROVIDER_APPROVED=true until the')
line('         provider smoke test passes against your safe test target.')
line(`Docs: ${provider.docs}`)
