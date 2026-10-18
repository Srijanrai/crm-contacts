import type { ErrorCode } from '@/types/api'

/** Test knobs: make the mock backend fail or stall the next request. */
export interface MockControls {
  /** The next API request (whose path contains `path`, if given) fails with this status (and code). */
  failNext(status: number, code?: ErrorCode, path?: string): void
  /** The next API request is delayed by ms (simulates a cold start). */
  coldStart(ms: number): void
  reset(): void
  takeFailure(pathname: string): { status: number; code: ErrorCode } | null
  takeColdStart(): number
}

export function createMockControls(): MockControls {
  let failure: { status: number; code: ErrorCode; path?: string } | null = null
  let coldStartMs = 0
  return {
    failNext(status, code, path) {
      failure = { status, code: code ?? (status >= 500 ? 'INTERNAL' : 'UNKNOWN'), path }
    },
    coldStart(ms) {
      coldStartMs = ms
    },
    reset() {
      failure = null
      coldStartMs = 0
    },
    takeFailure(pathname) {
      if (!failure || (failure.path && !pathname.includes(failure.path))) return null
      const { status, code } = failure
      failure = null
      return { status, code }
    },
    takeColdStart() {
      const ms = coldStartMs
      coldStartMs = 0
      return ms
    },
  }
}
