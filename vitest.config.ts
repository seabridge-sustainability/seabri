import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'gateway/**/*.test.ts', 'bridge/**/*.test.ts', 'db/**/*.test.ts', 'scripts/**/*.test.ts', 'sustainability/**/*.test.ts', 'improvement/**/*.test.ts', 'plugins/**/*.test.ts', 'api/**/*.test.ts', 'sdk/**/*.test.ts', 'integrations/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 15_000,
    coverage: {
      provider: 'v8',
      include: ['gateway/**/*.ts', 'src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/index.ts', 'gateway/index.ts'],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
      },
    },
  },
})
