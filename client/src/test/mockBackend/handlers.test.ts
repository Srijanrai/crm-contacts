import { contactsApi } from '@/api/contacts'
import { activityApi } from '@/api/activity'
import { tagsApi } from '@/api/tags'
import { DEFAULT_LIST_QUERY } from '@/validation/listQuery'
import type { ApiError } from '@/api/ApiError'
import type { Contact } from '@/types/api'
import { mockDb } from './server'

const list = (patch: Partial<typeof DEFAULT_LIST_QUERY> = {}) => contactsApi.list({ ...DEFAULT_LIST_QUERY, ...patch })
const fail = (p: Promise<unknown>) => p.then(() => { throw new Error('expected failure') }, (e: ApiError) => e)
const contacts = () => structuredClone(mockDb.read().contacts)
const find = (pred: (c: Contact) => boolean) => {
  const c = contacts().find(pred)
  if (!c) throw new Error('no matching seed contact')
  return c
}

describe('mock backend: list', () => {
  it('paginates the seeded contacts', async () => {
    const res = await list()
    expect(res.data).toHaveLength(20)
    expect(res.total).toBe(1000)
    expect(res.totalPages).toBe(50)
  })

  it('searches by name prefix (Jon and John Smith)', async () => {
    const res = await list({ q: 'jo', limit: 100 })
    const names = res.data.map((c) => `${c.firstName} ${c.lastName}`)
    expect(names).toEqual(expect.arrayContaining(['Jon Smith', 'John Smith']))
    expect(res.data.every((c) => [c.firstName, c.lastName, c.email].some((v) => v?.toLowerCase().startsWith('jo')))).toBe(true)
  })

  it('searches by last name and email prefix', async () => {
    expect((await list({ q: 'smith', limit: 100 })).data.some((c) => c.firstName === 'Jon')).toBe(true)
    const someone = find((c) => c.email !== null)
    const res = await list({ q: someone.email!.slice(0, 8).toUpperCase(), limit: 100 })
    expect(res.data.map((c) => c.id)).toContain(someone.id)
  })

  it('treats regex characters and apostrophes as plain text', async () => {
    await expect(list({ q: '(' })).resolves.toMatchObject({ total: 0 })
    await expect(list({ q: "o'brien" })).resolves.toBeDefined()
  })

  it('matches phone numbers by digits', async () => {
    const res = await list({ q: '+44 20' })
    expect(res.total).toBeGreaterThan(0)
    expect(res.data.every((c) => c.phone?.replace(/\D/g, '').startsWith('4420'))).toBe(true)
  })

  it('filters by any of the given tags, case-insensitively', async () => {
    const res = await list({ tags: ['vip'], limit: 100 })
    expect(res.total).toBeGreaterThan(0)
    expect(res.data.every((c) => c.tags.includes('VIP'))).toBe(true)
    const either = await list({ tags: ['VIP', 'Lead'] })
    expect(either.total).toBeGreaterThan(res.total)
  })

  it('filters by company prefix, case-insensitively', async () => {
    const company = find((c) => c.company !== null).company!
    const res = await list({ company: company.slice(0, 4).toLowerCase(), limit: 100 })
    expect(res.data.every((c) => c.company?.toLowerCase().startsWith(company.slice(0, 4).toLowerCase()))).toBe(true)
  })

  it('sorts by name ascending and descending, stable by id', async () => {
    const asc = (await list({ sort: 'name', limit: 100 })).data.map((c) => `${c.firstName} ${c.lastName ?? ''}`.trim().toLowerCase())
    expect(asc).toEqual([...asc].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)))
    const desc = (await list({ sort: '-name' })).data[0]
    expect(desc.firstName.toLowerCase() >= asc[0]).toBe(true)
  })

  it('sorts by created date both ways', async () => {
    const newest = (await list()).data.map((c) => c.createdAt)
    expect(newest).toEqual([...newest].sort().reverse())
    const oldest = (await list({ sort: 'createdAt' })).data.map((c) => c.createdAt)
    expect(oldest).toEqual([...oldest].sort())
  })

  it('returns non-overlapping pages', async () => {
    const p1 = (await list({ page: 1 })).data.map((c) => c.id)
    const p2 = (await list({ page: 2 })).data.map((c) => c.id)
    expect(p1.filter((id) => p2.includes(id))).toEqual([])
  })

  it('rejects limit above 100', async () => {
    const err = await fail(contactsApi.list({ ...DEFAULT_LIST_QUERY, limit: 101 }))
    expect(err).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(err.fields).toHaveProperty('limit')
  })
})

describe('mock backend: get and update', () => {
  it('returns 404 for an unknown id and 400 for a malformed one', async () => {
    expect(await fail(contactsApi.get('aaaaaaaaaaaaaaaaaaaaaaaa'))).toMatchObject({ status: 404, code: 'NOT_FOUND' })
    expect(await fail(contactsApi.get('nope'))).toMatchObject({ status: 400, code: 'INVALID_ID' })
  })

  it('updates fields, bumps the version and records CONTACT_UPDATED', async () => {
    const c = contacts()[0]
    const updated = await contactsApi.update(c.id, { version: c.version, company: 'New Co' })
    expect(updated).toMatchObject({ company: 'New Co', version: c.version + 1 })
    const activity = await activityApi.list(c.id)
    expect(activity.data[0]).toMatchObject({
      type: 'CONTACT_UPDATED',
      changes: [{ field: 'company', from: c.company, to: 'New Co' }],
    })
  })

  it('clears optional fields with an empty string', async () => {
    const c = find((x) => x.phone !== null)
    expect((await contactsApi.update(c.id, { version: c.version, phone: '' })).phone).toBeNull()
  })

  it('returns 409 VERSION_CONFLICT with the current contact for a stale version', async () => {
    const c = contacts()[0]
    await contactsApi.update(c.id, { version: c.version, company: 'First' })
    const err = await fail(contactsApi.update(c.id, { version: c.version, company: 'Second' }))
    expect(err).toMatchObject({ status: 409, code: 'VERSION_CONFLICT' })
    expect(err.details?.current).toMatchObject({ company: 'First', version: c.version + 1 })
  })

  it('rejects an email used by another contact, case-insensitively', async () => {
    const [a, b] = contacts().filter((c) => c.email !== null)
    const err = await fail(contactsApi.update(a.id, { version: a.version, email: b.email!.toUpperCase() }))
    expect(err).toMatchObject({ status: 409, code: 'EMAIL_TAKEN' })
    expect(err.fields?.email).toBe('This email is already used by another contact')
  })

  it('returns field errors for invalid input', async () => {
    const c = contacts()[0]
    const err = await fail(contactsApi.update(c.id, { version: c.version, firstName: ' ', email: 'bad' }))
    expect(err).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(err.fields).toMatchObject({ firstName: 'First name is required', email: 'Enter a valid email' })
  })

  it('treats a no-op update as success without bumping the version', async () => {
    const c = contacts()[0]
    const before = mockDb.read().activities.length
    const res = await contactsApi.update(c.id, { version: c.version, firstName: c.firstName })
    expect(res.version).toBe(c.version)
    expect(mockDb.read().activities.length).toBe(before)
  })
})

describe('mock backend: tags', () => {
  it('adds a tag idempotently, keeping the canonical casing', async () => {
    const c = find((x) => x.tags.includes('VIP'))
    const before = (await activityApi.list(c.id)).data.length
    const res = await contactsApi.addTag(c.id, 'vip')
    expect(res.tags.filter((t) => t.toLowerCase() === 'vip')).toEqual(['VIP'])
    expect((await activityApi.list(c.id)).data.length).toBe(before)
  })

  it('creates a new tag in the catalogue with normalised whitespace', async () => {
    const c = contacts()[0]
    const res = await contactsApi.addTag(c.id, 'hot   lead')
    expect(res.tags).toContain('hot lead')
    expect((await tagsApi.list()).map((t) => t.name)).toContain('hot lead')
    const again = await contactsApi.addTag(contacts()[1].id, 'Hot Lead')
    expect(again.tags).toContain('hot lead')
  })

  it('removes a tag by name with spaces and records TAG_REMOVED', async () => {
    const c = contacts()[0]
    await contactsApi.addTag(c.id, 'Hot Lead')
    const res = await contactsApi.removeTag(c.id, 'hot lead')
    expect(res.tags).not.toContain('Hot Lead')
    expect((await activityApi.list(c.id)).data[0]).toMatchObject({ type: 'TAG_REMOVED', tag: 'Hot Lead', source: 'single' })
  })

  it('rejects invalid tag names', async () => {
    const err = await fail(contactsApi.addTag(contacts()[0].id, 'C++'))
    expect(err).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(err.fields).toHaveProperty('tag')
  })

  it('bulk-assigns with correct counts and one activity per changed contact', async () => {
    const tagged = find((c) => c.tags.includes('VIP'))
    const untagged = contacts().filter((c) => !c.tags.includes('VIP')).slice(0, 2)
    const missing = 'bbbbbbbbbbbbbbbbbbbbbbbb'
    const res = await contactsApi.bulkTag({ tag: 'VIP', contactIds: [tagged.id, ...untagged.map((c) => c.id), missing] })
    expect(res).toEqual({ tag: 'VIP', requested: 4, updated: 2, alreadyTagged: 1, notFound: [missing], skipped: [] })
    for (const c of untagged) {
      const latest = (await activityApi.list(c.id)).data[0]
      expect(latest).toMatchObject({ type: 'TAG_ADDED', tag: 'VIP', source: 'bulk' })
    }
  })
})

describe('mock backend: activity', () => {
  it('lists newest first and pages with the before cursor', async () => {
    const busy = structuredClone(mockDb.read()).activities.reduce<Record<string, number>>((acc, a) => {
      acc[a.contactId] = (acc[a.contactId] ?? 0) + 1
      return acc
    }, {})
    const [contactId] = Object.entries(busy).sort((a, b) => b[1] - a[1])[0]
    const first = await activityApi.list(contactId, { limit: 5 })
    expect(first.data).toHaveLength(5)
    const times = first.data.map((a) => a.createdAt)
    expect(times).toEqual([...times].sort().reverse())
    const second = await activityApi.list(contactId, { limit: 5, before: first.nextCursor! })
    expect(second.data[0].createdAt <= first.data[4].createdAt).toBe(true)
    expect(second.data.map((a) => a.id)).not.toContain(first.data[4].id)
  })
})
