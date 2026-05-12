import { spawnSync } from 'child_process'

interface Step {
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
}

const steps: Step[] = [
  { name: 'Production config check', command: 'npm', args: ['run', 'check:production'] },
  { name: 'Typecheck', command: 'npm', args: ['run', 'typecheck'] },
  { name: 'Vitest', command: 'npm', args: ['test', '--', '--run'] },
  { name: 'Node tests', command: 'npm', args: ['run', 'test:node'] },
  { name: 'Playwright', command: 'npx', args: ['playwright', 'test'] },
  { name: 'Build', command: 'npm', args: ['run', 'build'] },
  { name: 'Audit', command: 'npm', args: ['audit', '--audit-level=moderate'] },
  { name: 'Staging validation', command: 'npm', args: ['run', 'validate:staging'] },
  { name: 'Secret wiring check', command: 'npm', args: ['run', 'check:secrets'] },
  { name: 'Provider readiness tests', command: 'npm', args: ['test', '--', '--run', 'gateway/seabri/provider-readiness.test.ts'] },
  { name: 'Registry snapshot tests', command: 'npm', args: ['test', '--', '--run', 'gateway/seabri/api-handler.test.ts', 'gateway/seabri/core-product-api.test.ts'] },
  { name: 'Mocked channel tests', command: 'npm', args: ['test', '--', '--run', 'gateway/channels/mocked-live-channel-smoke.test.ts', 'gateway/seabri/outbound.test.ts'] },
  { name: 'No-secret scan', command: 'tsx', args: ['scripts/secret-scan.ts'] },
]

for (const step of steps) {
  console.log(`\n[validate:production] ${step.name}`)
  const command = process.platform === 'win32' ? 'cmd.exe' : step.command
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', [step.command, ...step.args].join(' ')]
    : step.args
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      OPENSEABRI_DOTENV_OVERRIDE: 'false',
      OPENSEABRI_CHANNELS_ENABLED: '',
      OPENSEABRI_LIVE_PROVIDER_APPROVED: 'false',
      OPENSEABRI_LIVE_PROVIDER_TESTS_ENABLED: 'false',
      ...step.env,
    },
  })
  if (result.status !== 0) {
    console.error(`[validate:production] FAILED: ${step.name}`)
    process.exit(result.status ?? 1)
  }
}

console.log('\n[validate:production] PASS')
