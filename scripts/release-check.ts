import { spawnSync } from 'child_process'

interface Step {
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
}

const steps: Step[] = [
  { name: 'Production config', command: 'npm', args: ['run', 'check:production'] },
  { name: 'Production validation', command: 'npm', args: ['run', 'validate:production'] },
  { name: 'Secret surface check', command: 'npm', args: ['run', 'check:secrets'] },
  { name: 'Secret scan', command: 'npm', args: ['run', 'secret-scan'] },
  { name: 'Database release check', command: 'npm', args: ['run', 'check:db'] },
  { name: 'Database migration readiness', command: 'npm', args: ['run', 'db:migration-check'] },
  { name: 'Deployment preflight', command: 'npm', args: ['run', 'deployment:preflight'] },
  { name: 'Operational readiness check', command: 'npm', args: ['run', 'check:operational-readiness'] },
  { name: 'Demo smoke', command: 'npm', args: ['run', 'smoke:demos'] },
  { name: 'Pilot smoke', command: 'npm', args: ['run', 'smoke:pilot'] },
]

for (const step of steps) {
  console.log(`\n[release:check] ${step.name}`)
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
    console.error(`[release:check] FAILED: ${step.name}`)
    process.exit(result.status ?? 1)
  }
}

console.log('\n[release:check] PASS')
