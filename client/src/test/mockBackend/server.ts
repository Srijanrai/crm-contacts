import { setupServer } from 'msw/node'
import { createMockDb } from './db'
import { createMockControls } from './devControls'
import { createHandlers } from './handlers'

/** The mock backend for tests (MSW in Node): in memory, no latency. */
export const mockDb = createMockDb()
export const mockControls = createMockControls()
export const server = setupServer(...createHandlers(mockDb, { controls: mockControls }))
