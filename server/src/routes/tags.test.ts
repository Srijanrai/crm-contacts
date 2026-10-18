import type { Types } from 'mongoose'
import { vi } from 'vitest'
import { Activity, type ActivityDoc } from '../models/Activity.js'
import { Contact } from '../models/Contact.js'
import { Tag } from '../models/Tag.js'
import { contactRepository } from '../repositories/contactRepository.js'
import { setupApi } from '../test/app.js'
import { createAccount, createContact } from '../test/factories.js'

const activitiesFor = (id: Types.ObjectId) => Activity.find({ contactId: id }).sort({ _id: -1 }).lean<ActivityDoc[]>()

async function setup() {
  const ctx = await setupApi()
  const vip = await createContact(ctx.accountId, { firstName: 'Vee', tags: ['VIP'] })
  const plain = await createContact(ctx.accountId, { firstName: 'Plain' })
  const add = (id: unknown, tag: unknown) => ctx.api.post(`/api/contacts/${id}/tags`).send({ tag })
  const remove = (id: unknown, tag: string) => ctx.api.delete(`/api/contacts/${id}/tags/${encodeURIComponent(tag)}`)
  return { ...ctx, vip, plain, add, remove }
}

describe('tags on a contact', () => {
  it('adds a tag and records TAG_ADDED without changing the version', async () => {
    const { plain, add } = await setup()
    const res = await add(plain._id, 'VIP')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ tags: ['VIP'], version: 1 })
    expect(res.body.updatedAt).not.toBe(plain.updatedAt.toISOString())
    expect((await activitiesFor(plain._id))[0]).toMatchObject({ type: 'TAG_ADDED', tag: 'VIP', source: 'single' })
  })

  it('reuses the canonical casing and ignores a tag the contact already has', async () => {
    const { vip, plain, add } = await setup()
    const again = await add(vip._id, 'vip')
    expect(again.body.tags).toEqual(['VIP'])
    expect(await activitiesFor(vip._id)).toHaveLength(0)
    expect((await add(plain._id, 'vip')).body.tags).toEqual(['VIP'])
  })

  it('creates new tags in the catalogue with normalised whitespace', async () => {
    const { plain, vip, add, api } = await setup()
    expect((await add(plain._id, '  hot   lead ')).body.tags).toEqual(['hot lead'])
    expect((await add(vip._id, 'Hot Lead')).body.tags).toEqual(['VIP', 'hot lead'])
    expect((await api.get('/api/tags')).body).toEqual([{ name: 'hot lead' }, { name: 'VIP' }])
  })

  it('removes a tag by name with spaces, case-insensitively, and is idempotent', async () => {
    const { plain, add, remove } = await setup()
    await add(plain._id, 'hot lead')
    const res = await remove(plain._id, 'Hot Lead')
    expect(res.status).toBe(200)
    expect(res.body.tags).toEqual([])
    expect((await activitiesFor(plain._id))[0]).toMatchObject({ type: 'TAG_REMOVED', tag: 'hot lead' })
    const again = await remove(plain._id, 'hot lead')
    expect(again.status).toBe(200)
    expect(await activitiesFor(plain._id)).toHaveLength(2)
  })

  it('enforces the 20-tag limit', async () => {
    const { accountId, add } = await setup()
    const full = await createContact(accountId, { tags: Array.from({ length: 20 }, (_, i) => `t${i}`) })
    const res = await add(full._id, 'one more')
    expect(res.status).toBe(422)
    expect(res.body.error).toMatchObject({ code: 'TAG_LIMIT', message: 'A contact can have at most 20 tags' })
  })

  it('validates tag names', async () => {
    const { plain, add } = await setup()
    const res = await add(plain._id, 'C++')
    expect(res.status).toBe(400)
    expect(res.body.error.fields).toEqual({ tag: 'Use letters, numbers, spaces, - or _ only' })
  })

  it('hides contacts of other accounts', async () => {
    const { add, remove } = await setup()
    const stranger = await createContact(await createAccount(), { tags: ['VIP'] })
    expect((await add(stranger._id, 'Partner')).status).toBe(404)
    expect((await remove(stranger._id, 'VIP')).status).toBe(404)
    expect((await Contact.findById(stranger._id).lean())?.tags).toEqual(['VIP'])
  })

  it('creates one catalogue entry when two contacts get the same new tag at once', async () => {
    const { vip, plain, add, accountId } = await setup()
    const results = await Promise.all([add(vip._id, 'Partner'), add(plain._id, 'partner')])
    expect(results.map((r) => r.status)).toEqual([200, 200])
    expect(await Tag.countDocuments({ accountId, key: 'partner' })).toBe(1)
  })
})

describe('tag races', () => {
  afterEach(() => vi.restoreAllMocks())

  it('records one TAG_REMOVED when the same tag is removed twice at once (forced race)', async () => {
    const { vip, remove } = await setup()
    const original = contactRepository.findById
    let arrived = 0
    let release!: () => void
    const bothRead = new Promise<void>((r) => (release = r))
    vi.spyOn(contactRepository, 'findById').mockImplementation(async (...args) => {
      const result = await original(...args)
      if (arrived < 2) {
        arrived++
        if (arrived === 2) release()
        await bothRead
      }
      return result
    })
    const results = await Promise.all([remove(vip._id, 'VIP'), remove(vip._id, 'vip')])
    expect(arrived).toBe(2)
    expect(results.map((r) => r.status)).toEqual([200, 200])
    expect(results.every((r) => r.body.tags.length === 0)).toBe(true)
    expect((await activitiesFor(vip._id)).filter((a) => a.type === 'TAG_REMOVED')).toHaveLength(1)
  })
})

describe('GET /api/tags', () => {
  it('lists only this account’s tags, sorted case-insensitively', async () => {
    const { api, accountId } = await setup()
    await createContact(accountId, { tags: ['customer', 'Lead'] })
    await createContact(await createAccount(), { tags: ['Secret'] })
    expect((await api.get('/api/tags')).body.map((t: { name: string }) => t.name)).toEqual(['customer', 'Lead', 'VIP'])
  })
})
