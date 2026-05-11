import { spawnSync } from 'child_process'

interface Step {
  name: string
  command: string
  args: string[]
}

const steps: Step[] = [
  { name: 'Typecheck', command: 'npm', args: ['run', 'typecheck'] },
  { name: 'Vitest', command: 'npm', args: ['test', '--', '--run'] },
  { name: 'Node tests', command: 'npm', args: ['run', 'test:node'] },
  { name: 'Playwright', command: 'npx', args: ['playwright', 'test'] },
  { name: 'Build', command: 'npm', args: ['run', 'build'] },
  { name: 'Audit', command: 'npm', args: ['audit', '--audit-level=moderate'] },
  {
    name: 'Mocked channel smoke',
    command: 'npm',
    args: ['test', '--', '--run', 'gateway/channels/mocked-live-channel-smoke.test.ts', 'gateway/seabri/outbound.test.ts'],
  },
  {
    name: 'Provider readiness smoke',
    command: 'npm',
    args: ['test', '--', '--run', 'gateway/seabri/provider-readiness.test.ts', 'gateway/telemetry/store.test.ts'],
  },
]

for (const step of steps) {
  console.log(`\n[validate:staging] ${step.name}`)
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
    },
  })
  if (result.status !== 0) {
    console.error(`[validate:staging] FAILED: ${step.name}`)
    process.exit(result.status ?? 1)
  }
}

console.log('\n[validate:staging] PASS')
