import type { ApiErrorBody } from '@/types/api'
import { ApiError, isAbortError } from './ApiError'

interface ClientConfig {
  baseUrl: string
  onSlowStart?: () => void
  onRecovered?: () => void
  /** After this long without a response, the server is probably cold-starting. */
  slowAfterMs: number
  /** Longer than a Render free-tier cold start (30–60 s). */
  timeoutMs: number
}

let config: ClientConfig = { baseUrl: '', slowAfterMs: 4000, timeoutMs: 70_000 }
let slowReported = false

export function configureApiClient(opts: Partial<ClientConfig> & { baseUrl: string }): void {
  config = { slowAfterMs: 4000, timeoutMs: 70_000, ...opts }
  slowReported = false
}

export interface RequestOptions {
  method?: string
  body?: unknown
  signal?: AbortSignal
  query?: URLSearchParams
}

const NETWORK_MESSAGE = "Can't reach the server. Check your connection and try again."

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function isErrorBody(body: unknown): body is ApiErrorBody {
  const error = (body as ApiErrorBody | null)?.error
  return typeof error?.code === 'string' && typeof error.message === 'string'
}

function errorFromResponse(status: number, body: unknown): ApiError {
  if (isErrorBody(body)) {
    const { code, message, fields, details } = body.error
    return new ApiError({ status, code, message, fields, details })
  }
  return new ApiError({ status, code: 'UNKNOWN', message: `Something went wrong (HTTP ${status})` })
}

/** Ends the "waking up" state: on any response, and on a failure (the error UI takes over from the banner). */
function endSlowState() {
  if (slowReported) {
    slowReported = false
    config.onRecovered?.()
  }
}

/** The one place the app talks HTTP. Every failure becomes an ApiError, except caller aborts. */
export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, query } = opts
  const qs = query?.toString()
  const url = `${config.baseUrl}${path}${qs ? `?${qs}` : ''}`

  const controller = new AbortController()
  const abortFromCaller = () => controller.abort()
  signal?.addEventListener('abort', abortFromCaller)
  let timedOut = false
  const timeoutId = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, config.timeoutMs)
  const slowId = setTimeout(() => {
    if (!slowReported) {
      slowReported = true
      config.onSlowStart?.()
    }
  }, config.slowAfterMs)

  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
    endSlowState()
    const data = await readBody(res)
    if (!res.ok) throw errorFromResponse(res.status, data)
    return data as T
  } catch (e) {
    if (e instanceof ApiError) throw e
    if (signal?.aborted) throw new DOMException('The request was cancelled.', 'AbortError')
    endSlowState()
    if (timedOut) {
      throw new ApiError({ status: 0, code: 'TIMEOUT', message: 'The server took too long to respond. Please try again.' })
    }
    if (isAbortError(e) || e instanceof TypeError) {
      throw new ApiError({ status: 0, code: 'NETWORK', message: NETWORK_MESSAGE })
    }
    throw new ApiError({ status: 0, code: 'UNKNOWN', message: 'Something went wrong' })
  } finally {
    clearTimeout(timeoutId)
    clearTimeout(slowId)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}
