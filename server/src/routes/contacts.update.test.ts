import { vi } from 'vitest'
import type { Types } from 'mongoose'
import { Activity, type ActivityDoc } from '../models/Activity.js'
import { Contact } from '../models/Contact.js'
import { activityRepository } from '../repositories/activityRepository.js'
import { contactRepository } from '../repositories/contactRepository.js'
import { setupApi } from '../test/app.js'
import { createAccount, createContact } from '../test/factories.js'

async function setup() {
  const ctx = await setupApi()
  const ada = await createContact(ctx.accountId, { firstName: 'Ada', email: 'ada@example.com', phone: '+1 555 010 0001', company: 'Acme' })
  const bob = await createContact(ctx.accountId, { firstName: 'Bob', email: 'bob@example.com' })
  const patch = (id: unknown, body: unknown) => ctx.api.patch(`/api/contacts/${id}`).send(body as object)
  return { ...ctx, ada, bob, patch }
}

const activitiesFor = (id: Types.ObjectId) => Activity.find({ contactId: id }).lean<ActivityDoc[]>()

afterEach(() => vi.restoreAllMocks())

describe('PATCH /api/contacts/:id', () => {
  it('updates fields, bumps the version and records CONTACT_UPDATED', async () => {
    const { ada, patch } = await setup()
    const res = await patch(ada._id, { version: 1, company: 'Engines' })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ company: 'Engines', version: 2 })
    const [a] = await activitiesFor(ada._id)
    expect(a).toMatchObject({ type: 'CONTACT_UPDATED', source: 'single', changes: [{ field: 'company', from: 'Acme', to: 'Engines' }] })
  })

  it('clears an optional field with an empty string', async () => {
    const { ada, patch } = await setup()
    const res = await patch(ada._id, { version: 1, phone: '' })
    expect(res.body.phone).toBeNull()
    const stored = await Contact.findById(ada._id).lean()
    expect(stored).not.toHaveProperty('phone')
    expect(stored?.phoneDigits).toBe('')
    expect((await activitiesFor(ada._id))[0].changes).toEqual([{ field: 'phone', from: '+1 555 010 0001', to: null }])
  })

  it('keeps derived search fields in sync', async () => {
    const { ada, patch, api } = await setup()
    await patch(ada._id, { version: 1, firstName: 'Augusta', lastName: 'King' })
    expect((await api.get('/api/contacts?q=augusta king')).body.total).toBe(1)
    expect((await api.get('/api/contacts?q=king')).body.total).toBe(1)
  })

  it('returns 409 VERSION_CONFLICT with the current contact for a stale version', async () => {
    const { ada, patch } = await setup()
    await patch(ada._id, { version: 1, company: 'First' })
    const res = await patch(ada._id, { version: 1, phone: '+1 555 999 0000' })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('VERSION_CONFLICT')
    expect(res.body.error.details.current).toMatchObject({ company: 'First', version: 2 })
  })

  it('treats a stale no-op as a conflict too, and a current no-op as success without a new version', async () => {
    const { ada, patch } = await setup()
    const same = await patch(ada._id, { version: 1, company: 'Acme' })
    expect(same.status).toBe(200)
    expect(same.body.version).toBe(1)
    expect(await activitiesFor(ada._id)).toHaveLength(0)
    await patch(ada._id, { version: 1, company: 'Other' })
    expect((await patch(ada._id, { version: 1, company: 'Other' })).status).toBe(409)
  })

  it('rejects an email used by another contact, case-insensitively', async () => {
    const { ada, patch } = await setup()
    const res = await patch(ada._id, { version: 1, email: 'BOB@example.com' })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatchObject({ code: 'EMAIL_TAKEN', fields: { email: 'This email is already used by another contact' } })
  })

  it('allows an email that exists only in another account', async () => {
    const { ada, patch } = await setup()
    const other = await createAccount()
    await createContact(other, { email: 'shared@example.com' })
    expect((await patch(ada._id, { version: 1, email: 'shared@example.com' })).status).toBe(200)
  })

  it('returns field errors with the frontend messages', async () => {
    const { ada, patch } = await setup()
    const res = await patch(ada._id, { version: 1, firstName: ' ', email: 'bad' })
    expect(res.status).toBe(400)
    expect(res.body.error.fields).toEqual({ firstName: 'First name is required', email: 'Enter a valid email' })
  })

  it('rejects operators, wrong types and unknown fields without touching the record', async () => {
    const { ada, patch } = await setup()
    for (const body of [{ version: 1, email: { $ne: null } }, { version: '1', company: 'x' }, { version: 1, accountId: 'x' }, [], null]) {
      const res = await patch(ada._id, body)
      expect(res.status, JSON.stringify(body)).toBe(400)
    }
    expect((await Contact.findById(ada._id).lean())?.version).toBe(1)
  })

  it('hides contacts of other accounts', async () => {
    const { patch } = await setup()
    const other = await createAccount()
    const stranger = await createContact(other)
    expect((await patch(stranger._id, { version: 1, company: 'Hacked' })).status).toBe(404)
    expect((await Contact.findById(stranger._id).lean())?.company).toBe('Acme')
  })

  it('lets exactly one of two simultaneous saves of the same version win', async () => {
    const { ada, patch } = await setup()
    const results = await Promise.all([patch(ada._id, { version: 1, company: 'A' }), patch(ada._id, { version: 1, company: 'B' })])
    expect(results.map((r) => r.status).sort()).toEqual([200, 409])
    expect((await Contact.findById(ada._id).lean())?.version).toBe(2)
    expect(await activitiesFor(ada._id)).toHaveLength(1)
  })

  it('still lets exactly one win when both saves read version 1 before either writes (forced race)', async () => {
    const { ada, patch } = await setup()
    // Hold the first two reads until both have happened, so both transactions see version 1.
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
    const results = await Promise.all([patch(ada._id, { version: 1, company: 'A' }), patch(ada._id, { version: 1, company: 'B' })])
    expect(arrived).toBe(2)
    expect(results.map((r) => r.status).sort()).toEqual([200, 409])
    expect(results.find((r) => r.status === 409)?.body.error.code).toBe('VERSION_CONFLICT')
    expect((await Contact.findById(ada._id).lean())?.version).toBe(2)
    expect(await activitiesFor(ada._id)).toHaveLength(1)
  })

  it('never returns 500 when two contacts take the same new email at once', async () => {
    const { ada, bob, patch } = await setup()
    const results = await Promise.all([
      patch(ada._id, { version: 1, email: 'same@example.com' }),
      patch(bob._id, { version: 1, email: 'same@example.com' }),
    ])
    expect(results.map((r) => r.status).sort()).toEqual([200, 409])
    expect(results.find((r) => r.status === 409)?.body.error.code).toBe('EMAIL_TAKEN')
  })

  it('rolls the change back if recording the activity fails', async () => {
    const { ada, patch } = await setup()
    vi.spyOn(activityRepository, 'insertMany').mockRejectedValueOnce(new Error('disk full'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await patch(ada._id, { version: 1, company: 'Engines' })
    expect(res.status).toBe(500)
    expect(await Contact.findById(ada._id).lean()).toMatchObject({ company: 'Acme', version: 1 })
  })
})
