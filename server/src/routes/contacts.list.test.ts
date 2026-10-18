import { createAccount, createContact } from '../test/factories.js'
import { setupApi } from '../test/app.js'

const DTO_KEYS = ['company', 'createdAt', 'email', 'firstName', 'id', 'lastName', 'phone', 'tags', 'updatedAt', 'version']

async function seed() {
  const ctx = await setupApi()
  const { accountId } = ctx
  const day = (n: number) => new Date(Date.UTC(2026, 0, n))
  const jon = await createContact(accountId, { firstName: 'Jon', lastName: 'Smith', company: 'Globex', tags: ['VIP'], createdAt: day(1) })
  const john = await createContact(accountId, { firstName: 'John', lastName: 'Smith', company: 'Globex', tags: ['Lead'], createdAt: day(2) })
  const ada = await createContact(accountId, {
    firstName: 'Ada',
    lastName: null,
    email: 'Ada.Lovelace@Engines.io',
    phone: '+44 20 7946 0958',
    company: 'Acme Ltd',
    tags: ['VIP', 'Lead'],
    createdAt: day(3),
  })
  const zed = await createContact(accountId, { firstName: 'Zed', lastName: 'Zulu', email: null, phone: null, company: 'Acmeco', createdAt: day(4) })
  const other = await createAccount()
  const stranger = await createContact(other, { firstName: 'Jo', lastName: 'Stranger', tags: ['VIP'] })
  return { ...ctx, jon, john, ada, zed, stranger }
}

const names = (body: { data: { firstName: string }[] }) => body.data.map((c) => c.firstName)

describe('GET /api/contacts', () => {
  it('returns a page with totals and only the caller account', async () => {
    const { api } = await seed()
    const res = await api.get('/api/contacts')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ page: 1, limit: 20, total: 4, totalPages: 1 })
    expect(names(res.body)).toEqual(['Zed', 'Ada', 'John', 'Jon'])
    expect(Object.keys(res.body.data[0]).sort()).toEqual(DTO_KEYS)
  })

  it('returns null for missing optional fields', async () => {
    const { api } = await seed()
    const zed = (await api.get('/api/contacts?q=zed')).body.data[0]
    expect(zed).toMatchObject({ email: null, phone: null, lastName: 'Zulu' })
    const ada = (await api.get('/api/contacts?q=ada')).body.data[0]
    expect(ada.lastName).toBeNull()
  })

  it('searches name, last name, email and phone by prefix', async () => {
    const { api } = await seed()
    expect(names((await api.get('/api/contacts?q=jo')).body).sort()).toEqual(['John', 'Jon'])
    expect(names((await api.get('/api/contacts?q=smith')).body).sort()).toEqual(['John', 'Jon'])
    expect(names((await api.get('/api/contacts?q=ADA.LOVE')).body)).toEqual(['Ada'])
    expect(names((await api.get(`/api/contacts?q=${encodeURIComponent('+44 20')}`)).body)).toEqual(['Ada'])
  })

  it('treats regex characters as plain text', async () => {
    const { api } = await seed()
    for (const q of ['(', '.*', '[a-z]', 'jo$']) {
      const res = await api.get(`/api/contacts?q=${encodeURIComponent(q)}`)
      expect(res.status).toBe(200)
      expect(res.body.total).toBe(0)
    }
  })

  it('filters by any of the given tags, case-insensitively', async () => {
    const { api } = await seed()
    expect(names((await api.get('/api/contacts?tags=vip')).body).sort()).toEqual(['Ada', 'Jon'])
    expect(names((await api.get('/api/contacts?tags=VIP,Lead')).body).sort()).toEqual(['Ada', 'John', 'Jon'])
    expect((await api.get('/api/contacts?tags=Unknown')).body.total).toBe(0)
  })

  it('filters by company prefix, case-insensitively', async () => {
    const { api } = await seed()
    expect(names((await api.get('/api/contacts?company=ACM')).body).sort()).toEqual(['Ada', 'Zed'])
    expect(names((await api.get('/api/contacts?company=acme%20l')).body)).toEqual(['Ada'])
  })

  it('sorts by name and by created date in both directions', async () => {
    const { api } = await seed()
    expect(names((await api.get('/api/contacts?sort=name')).body)).toEqual(['Ada', 'John', 'Jon', 'Zed'])
    expect(names((await api.get('/api/contacts?sort=-name')).body)).toEqual(['Zed', 'Jon', 'John', 'Ada'])
    expect(names((await api.get('/api/contacts?sort=createdAt')).body)).toEqual(['Jon', 'John', 'Ada', 'Zed'])
  })

  it('pages without overlap', async () => {
    const { api } = await seed()
    const p1 = await api.get('/api/contacts?limit=3&sort=name')
    const p2 = await api.get('/api/contacts?limit=3&sort=name&page=2')
    expect(p1.body).toMatchObject({ total: 4, totalPages: 2 })
    expect(names(p1.body)).toEqual(['Ada', 'John', 'Jon'])
    expect(names(p2.body)).toEqual(['Zed'])
  })

  it('rejects invalid query parameters with 400', async () => {
    const { api } = await seed()
    for (const qs of ['q=%00', 'company=a%00b', `company=${'c'.repeat(101)}`, 'limit=101', 'page=0', 'page=1&page=2', 'page=99999999999999999999', 'sort=password']) {
      const res = await api.get(`/api/contacts?${qs}`)
      expect(res.status, qs).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    }
  })
})

describe('GET /api/contacts/:id', () => {
  it('returns one contact', async () => {
    const { api, ada } = await seed()
    const res = await api.get(`/api/contacts/${ada._id}`)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: ada._id.toString(), firstName: 'Ada', email: 'ada.lovelace@engines.io', tags: ['VIP', 'Lead'], version: 1 })
  })

  it('hides contacts of other accounts', async () => {
    const { api, stranger } = await seed()
    const res = await api.get(`/api/contacts/${stranger._id}`)
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it('rejects malformed ids', async () => {
    const { api } = await seed()
    const res = await api.get('/api/contacts/nope')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_ID')
  })
})
