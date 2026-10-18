import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { configureApiClient } from '@/api/client'
import { mockControls, mockDb, server } from '@/test/mockBackend/server'

// Any console.error / console.warn during a test is a bug (React key/act
// warnings, router warnings, unhandled MSW requests). They are collected and
// fail the test afterwards; throwing inline would run through React/Redux
// internals and change the behaviour under test.
const consoleProblems: string[] = []
for (const level of ['error', 'warn'] as const) {
  console[level] = (...args: unknown[]) => {
    consoleProblems.push(`console.${level}: ${args.map(String).join(' ')}`)
  }
}

// Page tests type, debounce (300 ms) and fetch; under a parallel full run on a busy machine 1–3 s is too tight.
configure({ asyncUtilTimeout: 6000 })

export const TEST_API_URL = 'http://localhost:4000'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  configureApiClient({ baseUrl: TEST_API_URL })
})
afterEach(() => {
  cleanup()
  if (consoleProblems.length) {
    const problems = consoleProblems.splice(0)
    throw new Error(`Console problems during test:\n${problems.join('\n')}`)
  }
  server.resetHandlers()
  mockDb.reset()
  mockControls.reset()
})
afterAll(() => server.close())
