import { ApiError } from './ApiError'
import { configureApiClient, request } from './client'

type FetchArgs = [string, RequestInit]

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** A fetch stub whose response we resolve by hand; honours the abort signal like real fetch. */
function deferredFetch() {
  let resolve!: (r: Response) => void
  const fetchMock = vi.fn<(...args: FetchArgs) => Promise<Response>>((...[, init]: FetchArgs) => {
    return new Promise<Response>((res, rej) => {
      resolve = res
      init.signal?.addEventListener('abort', () => rej(init.signal?.reason ?? new DOMException('Aborted', 'AbortError')))
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, respond: (r: Response) => resolve(r) }
}

beforeEach(() => {
  configureApiClient({ baseUrl: 'http://api.test' })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('request', () => {
  it('returns parsed JSON for a successful response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { ok: true })))
    await expect(request('/api/health')).resolves.toEqual({ ok: true })
  })

  it('sends JSON bodies with the method and base URL', async () => {
    const fetchMock = vi.fn<(...args: FetchArgs) => Promise<Response>>(async () => jsonResponse(200, {}))
    vi.stubGlobal('fetch', fetchMock)
    await request('/api/x', { method: 'PATCH', body: { a: 1 } })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://api.test/api/x')
    expect(init.method).toBe('PATCH')
    expect(init.body).toBe('{"a":1}')
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
  })

  it('maps a JSON error body to ApiError with code, fields and details', async () => {
    const current = { id: '1', version: 3 }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(409, { error: { code: 'VERSION_CONFLICT', message: 'Stale', details: { current } } }),
      ),
    )
    const err = await request('/api/contacts/1').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 409, code: 'VERSION_CONFLICT', message: 'Stale', details: { current } })
  })

  it('maps a non-JSON error response to UNKNOWN with the HTTP status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Bad gateway</html>', { status: 502 })))
    await expect(request('/api/x')).rejects.toMatchObject({
      status: 502,
      code: 'UNKNOWN',
      message: 'Something went wrong (HTTP 502)',
    })
  })

  it('maps a network failure to NETWORK', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(request('/api/x')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK',
      message: "Can't reach the server. Check your connection and try again.",
    })
  })

  it('maps its own timeout to TIMEOUT', async () => {
    vi.useFakeTimers()
    deferredFetch()
    configureApiClient({ baseUrl: '', timeoutMs: 1000, slowAfterMs: 5000 })
    const p = request('/api/x').catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(1000)
    expect(await p).toMatchObject({ code: 'TIMEOUT' })
  })

  it('rethrows an abort from the caller signal unchanged', async () => {
    deferredFetch()
    const controller = new AbortController()
    const p = request('/api/x', { signal: controller.signal }).catch((e: unknown) => e)
    controller.abort()
    const err = await p
    expect(err).not.toBeInstanceOf(ApiError)
    expect((err as Error).name).toBe('AbortError')
  })

  it('clears the slow-start notice when the slow request fails', async () => {
    vi.useFakeTimers()
    const onSlowStart = vi.fn<() => void>()
    const onRecovered = vi.fn<() => void>()
    configureApiClient({ baseUrl: '', onSlowStart, onRecovered, timeoutMs: 6000 })
    deferredFetch()
    const p = request('/api/x').catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(4000)
    expect(onSlowStart).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(2000)
    expect(await p).toMatchObject({ code: 'TIMEOUT' })
    expect(onRecovered).toHaveBeenCalledTimes(1)
  })

  it('reports a slow start once after 4s and recovery on the next response', async () => {
    vi.useFakeTimers()
    const onSlowStart = vi.fn<() => void>()
    const onRecovered = vi.fn<() => void>()
    configureApiClient({ baseUrl: '', onSlowStart, onRecovered })
    const { respond } = deferredFetch()
    const p = request('/api/x')
    await vi.advanceTimersByTimeAsync(3999)
    expect(onSlowStart).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(onSlowStart).toHaveBeenCalledTimes(1)
    respond(jsonResponse(200, {}))
    await p
    expect(onRecovered).toHaveBeenCalledTimes(1)
  })
})
