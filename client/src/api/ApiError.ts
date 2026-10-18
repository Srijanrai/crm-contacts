import type { Contact, ErrorCode } from '@/types/api'

export interface ApiErrorInit {
  status: number
  code: ErrorCode
  message: string
  fields?: Record<string, string>
  details?: { current?: Contact }
}

/** The single error shape every API failure is normalised into. */
export class ApiError extends Error {
  status: number
  code: ErrorCode
  fields?: Record<string, string>
  details?: { current?: Contact }

  constructor(init: ApiErrorInit) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.fields = init.fields
    this.details = init.details
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError

export const isAbortError = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && (e as { name?: unknown }).name === 'AbortError'

/** Coerces anything thrown into an ApiError (for thunks and hooks). */
export function toApiError(e: unknown): ApiError {
  if (isApiError(e)) return e
  return new ApiError({
    status: 0,
    code: 'UNKNOWN',
    message: e instanceof Error && e.message ? e.message : 'Something went wrong',
  })
}

/** Plain-object form of ApiError for the Redux store (no class instances in state). */
export interface SerializedApiError {
  status: number
  code: ErrorCode
  message: string
  fields?: Record<string, string>
  /** The server's latest contact, on VERSION_CONFLICT. */
  current?: Contact
}

export function serializeApiError(e: ApiError): SerializedApiError {
  const out: SerializedApiError = { status: e.status, code: e.code, message: e.message }
  if (e.fields) out.fields = e.fields
  if (e.details?.current) out.current = e.details.current
  return out
}
