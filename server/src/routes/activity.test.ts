import mongoose from 'mongoose'
import { Activity } from '../models/Activity.js'
import { setupApi } from '../test/app.js'
import { createAccount, createContact } from '../test/factories.js'

async function setup() {
  const ctx = await setupApi()
  const c = await createContact(ctx.accountId)
  const base = Date.UTC(2026, 5, 1)
  // 25 entries; pairs share a timestamp so the _id tie-break matters.
  await Activity.insertMany(
    Array.from({ length: 25 }, (_, i) => ({
      accountId: ctx.accountId,
      contactId: c._id,
      type: 'TAG_ADDED',
      tag: `t${i}`,
      source: 'single',
      createdAt: new Date(base + Math.floor(i / 2) * 1000),
    })),
  )
  return { ...ctx, c, list: (qs = '') => ctx.api.get(`/api/contacts/${c._id}/activity${qs}`) }
}

describe('GET /api/contacts/:id/activity', () => {
  it('pages newest first with a cursor and no overlap', async () => {
    const { list } = await setup()
    const first = await list()
    expect(first.status).toBe(200)
    expect(first.body.data).toHaveLength(20)
    const times = first.body.data.map((a: { createdAt: string }) => a.createdAt)
    expect(times).toEqual([...times].sort().reverse())
    expect(first.body.nextCursor).toBe(first.body.data[19].id)

    const second = await list(`?before=${first.body.nextCursor}`)
    expect(second.body.data).toHaveLength(5)
    expect(second.body.nextCursor).toBeNull()
    const all = [...first.body.data, ...second.body.data].map((a: { id: string }) => a.id)
    expect(new Set(all).size).toBe(25)
  })

  it('returns the DTO shape', async () => {
    const { list, c } = await setup()
    const [a] = (await list('?limit=1')).body.data
    expect(a).toMatchObject({ contactId: c._id.toString(), type: 'TAG_ADDED', tag: 't24', source: 'single' })
    expect(Object.keys(a).sort()).toEqual(['contactId', 'createdAt', 'id', 'source', 'tag', 'type'])
  })

  it('shows a new edit first', async () => {
    const { api, c, list } = await setup()
    await api.patch(`/api/contacts/${c._id}`).send({ version: 1, company: 'Engines' })
    const [latest] = (await list('?limit=1')).body.data
    expect(latest).toMatchObject({ type: 'CONTACT_UPDATED', changes: [{ field: 'company', from: 'Acme', to: 'Engines' }] })
  })

  it('validates limit and cursor', async () => {
    const { list } = await setup()
    expect((await list('?limit=51')).status).toBe(400)
    const bad = await list(`?before=${new mongoose.Types.ObjectId()}`)
    expect(bad.status).toBe(400)
    expect(bad.body.error.fields).toEqual({ before: 'Invalid cursor' })
  })

  it('hides other accounts’ contacts', async () => {
    const { api } = await setup()
    const stranger = await createContact(await createAccount())
    expect((await api.get(`/api/contacts/${stranger._id}/activity`)).status).toBe(404)
  })
})
