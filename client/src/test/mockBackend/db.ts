import type { Activity, Contact } from '@/types/api'
import { seedData } from './seed'

export interface MockState {
  contacts: Contact[]
  /** Canonical tag names (the catalogue). */
  tags: string[]
  activities: Activity[]
  activitySeq: number
}

export interface MockDb {
  /** Current state (live object; mutate only inside transact). */
  read(): MockState
  /** Runs fn against the current state. */
  transact<T>(fn: (state: MockState) => T): T
  reset(): void
}

/** In-memory database behind the test-only mock backend; reset to the seed after every test. */
export function createMockDb(opts: { seedCount?: number; seed?: number } = {}): MockDb {
  const { seedCount = 1000, seed = 42 } = opts
  let pristine: MockState | null = null
  const fresh = (): MockState => structuredClone((pristine ??= seedData(seedCount, seed)))
  let state: MockState | null = null
  const read = () => (state ??= fresh())
  return {
    read,
    transact: (fn) => fn(read()),
    reset() {
      state = fresh()
    },
  }
}
