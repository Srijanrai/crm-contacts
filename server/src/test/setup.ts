import { afterAll, afterEach, beforeAll } from 'vitest'
import { clearTestDb, startTestDb, stopTestDb } from './db.js'

beforeAll(startTestDb)
afterEach(clearTestDb)
afterAll(stopTestDb)
