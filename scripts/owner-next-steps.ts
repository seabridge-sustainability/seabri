const required = [
  'OPENSEABRI_MODE',
  'OPENSEABRI_API_KEY',
  'SEABRI_WS_TOKEN',
  'OPENSEABRI_CANVAS_WS_TOKEN',
  'OPENSEABRI_CORS_ORIGIN',
  'OPENSEABRI_RATE_LIMIT',
  'OPENSEABRI_PERSISTENCE_ADAPTER',
]

const hasDb = Boolean(process.env.SEABRI_DATABASE_URL || process.env.DATABASE_URL)
const liveChannels = (process.env.OPENSEABRI_CHANNELS_ENABLED || '').trim()
const liveApproved = (process.env.OPENSEABRI_LIVE_PROVIDER_APPROVED || '').toLowerCase() === 'true'
const missing = required.filter((name) => !process.env[name])

function line(text: string): void {
  console.log(`[owner:next] ${text}`)
}

line('OpenSeaBri local package is ready. Remaining work is owner/external setup only.')
line('Do not paste secrets into chat. Do not enable live providers during first deploy.')

if (missing.length === 0 && hasDb) {
  line('production-shaped env labels are present in this shell')
} else {
  line(`missing required env labels in this shell: ${[...missing, ...(hasDb ? [] : ['SEABRI_DATABASE_URL or DATABASE_URL'])].join(', ')}`)
}

line('absolute minimum owner actions:')
console.log('1. Choose one host: Render, Railway, or Fly.io.')
console.log('2. Create managed PostgreSQL.')
console.log('3. Add required env labels to the host secret manager.')
console.log('4. Deploy with build command: npm ci && npm run build')
console.log('5. Start with command: npm run gateway')
console.log('6. Run DB migration: npm run db:migrate')
console.log('7. Verify DB tables: OPENSEABRI_DB_CONNECT_CHECK=true npm run db:migration-check')
console.log('8. Point GoDaddy DNS: app.<domain> and api.<domain> to the host.')
console.log('9. Run hosted smoke: OPENSEABRI_BASE_URL=https://api.<domain> npm run check:operational')
console.log('10. Keep OPENSEABRI_CHANNELS_ENABLED empty until provider evidence exists.')

line(`live channels currently requested in this shell: ${liveChannels || '(none)'}`)
line(`live provider approved in this shell: ${liveApproved}`)
if (liveChannels || liveApproved) {
  line('warning: close live provider gates before first production deploy unless provider evidence is approved')
}
