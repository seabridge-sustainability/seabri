import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // `tests/*.mts` use node:test; run them via `npm run test:node`.
    include: ['src/**/*.test.{ts,tsx}', 'gateway/**/*.test.ts', 'db/**/*.test.ts', 'scripts/**/*.test.ts', 'sustainability/**/*.test.ts', 'improvement/**/*.test.ts', 'plugins/**/*.test.ts', 'api/**/*.test.ts', 'sdk/**/*.test.ts', 'integrations/**/*.test.ts'],
    environment: 'node',
  },
})
