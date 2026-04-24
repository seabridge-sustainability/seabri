import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // `tests/*.mts` use node:test; run them via `npm run test:node`.
    include: ['src/**/*.test.{ts,tsx}', 'gateway/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
})
