import { configureApiClient } from './client'
import { contactsApi } from './contacts'
import { DEFAULT_LIST_QUERY } from '@/validation/listQuery'

const okFetch = () => {
  const fetchMock = vi.fn<(...args: [string, RequestInit]) => Promise<Response>>(async () => new Response('{}', { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => configureApiClient({ baseUrl: 'http://api.test' }))
afterEach(() => vi.unstubAllGlobals())

describe('contactsApi', () => {
  it('builds the list query with filters, sort, page and limit', async () => {
    const fetchMock = okFetch()
    await contactsApi.list({ ...DEFAULT_LIST_QUERY, q: 'jo', tags: ['VIP', 'Lead'], sort: 'name', page: 2 })
    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.pathname).toBe('/api/contacts')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: 'jo',
      tags: 'VIP,Lead',
      sort: 'name',
      page: '2',
      limit: '20',
    })
  })

  it('URL-encodes tag names when removing a tag', async () => {
    const fetchMock = okFetch()
    await contactsApi.removeTag('1', 'Hot Lead')
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/contacts/1/tags/Hot%20Lead')
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
  })

  it('posts tag additions and bulk assignments', async () => {
    const fetchMock = okFetch()
    await contactsApi.addTag('1', 'VIP')
    await contactsApi.bulkTag({ contactIds: ['1', '2'], tag: 'VIP' })
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/contacts/1/tags')
    expect(fetchMock.mock.calls[0][1].body).toBe('{"tag":"VIP"}')
    expect(fetchMock.mock.calls[1][0]).toBe('http://api.test/api/contacts/bulk/tags')
    expect(fetchMock.mock.calls[1][1].method).toBe('POST')
  })

  it('patches updates with the version', async () => {
    const fetchMock = okFetch()
    await contactsApi.update('1', { version: 4, email: 'a@b.co' })
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PATCH', body: '{"version":4,"email":"a@b.co"}' })
  })
})
