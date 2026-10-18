import mongoose from 'mongoose'
import { Activity, type ActivityDoc } from '../models/Activity.js'
import { Contact } from '../models/Contact.js'
import { setupApi } from '../test/app.js'
import { createAccount, createContact } from '../test/factories.js'

describe('POST /api/contacts/bulk/tags', () => {
  it('reports updated, already tagged, not found and skipped contacts, writing one activity per change', async () => {
    const { api, accountId } = await setupApi()
    const tagged = await createContact(accountId, { tags: ['VIP'] })
    const full = await createContact(accountId, { tags: Array.from({ length: 20 }, (_, i) => `t${i}`) })
    const a = await createContact(accountId)
    const b = await createContact(accountId)
    const stranger = await createContact(await createAccount())
    const missing = new mongoose.Types.ObjectId().toString()
    const ids = [tagged, full, a, b, stranger].map((c) => c._id.toString())

    const res = await api.post('/api/contacts/bulk/tags').send({ tag: 'vip', contactIds: [...ids, missing, ids[2]] })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      tag: 'VIP',
      requested: 6,
      updated: 2,
      alreadyTagged: 1,
      notFound: [stranger._id.toString(), missing],
      skipped: [full._id.toString()],
    })
    const acts = await Activity.find({ accountId }).lean<ActivityDoc[]>()
    expect(acts.map((x) => x.contactId.toString()).sort()).toEqual([a._id.toString(), b._id.toString()].sort())
    expect(acts.every((x) => x.type === 'TAG_ADDED' && x.source === 'bulk' && x.tag === 'VIP')).toBe(true)
    expect((await Contact.findById(stranger._id).lean())?.tags).toEqual([])
    expect((await Contact.findById(a._id).lean())?.version).toBe(1)
  })

  it('creates a new tag in the catalogue and returns its canonical name', async () => {
    const { api, accountId } = await setupApi()
    const c = await createContact(accountId)
    const res = await api.post('/api/contacts/bulk/tags').send({ tag: '  Q4   push ', contactIds: [c._id.toString()] })
    expect(res.body).toMatchObject({ tag: 'Q4 push', updated: 1 })
    expect((await api.get('/api/tags')).body).toEqual([{ name: 'Q4 push' }])
  })

  it('does not add a tag to the catalogue when no contact was tagged', async () => {
    const { api } = await setupApi()
    const res = await api.post('/api/contacts/bulk/tags').send({ tag: 'Ghost', contactIds: [new mongoose.Types.ObjectId().toString()] })
    expect(res.body).toMatchObject({ tag: 'Ghost', updated: 0 })
    expect((await api.get('/api/tags')).body).toEqual([])
  })

  it('validates the request', async () => {
    const { api } = await setupApi()
    expect((await api.post('/api/contacts/bulk/tags').send({ tag: 'VIP', contactIds: [] })).status).toBe(400)
    const many = Array.from({ length: 501 }, () => new mongoose.Types.ObjectId().toString())
    expect((await api.post('/api/contacts/bulk/tags').send({ tag: 'VIP', contactIds: many })).status).toBe(400)
    expect((await api.post('/api/contacts/bulk/tags').send({ tag: 'C++', contactIds: [many[0]] })).body.error.fields).toHaveProperty('tag')
  })
})
