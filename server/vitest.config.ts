import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
    // Each test file gets its own process and in-memory replica set.
    pool: 'forks',
    testTimeout: 20_000,
    hookTimeout: 120_000, // the first run downloads the MongoDB binary into .cache/
  },
})
