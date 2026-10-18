import mongoose from 'mongoose'
import { Contact } from './Contact.js'
import { derivedFields } from './derived.js'

const account = () => new mongoose.Types.ObjectId()
const base = (accountId: mongoose.Types.ObjectId, extra: Record<string, unknown> = {}) => ({
  accountId,
  firstName: 'Ada',
  ...derivedFields({ firstName: 'Ada' }),
  ...extra,
})

describe('derivedFields', () => {
  it('builds lowercase search keys and phone digits', () => {
    expect(derivedFields({ firstName: 'Ada', lastName: 'Lovelace', phone: '+44 (20) 7946', company: 'Acme Ltd' })).toEqual({
      searchName: 'ada lovelace',
      searchLastName: 'lovelace',
      phoneDigits: '44207946',
      companyLower: 'acme ltd',
    })
  })

  it('handles missing optional values', () => {
    expect(derivedFields({ firstName: 'Ada', lastName: null })).toEqual({ searchName: 'ada', searchLastName: '', phoneDigits: '', companyLower: '' })
  })
})

describe('Contact indexes', () => {
  it('rejects a duplicate email within one account', async () => {
    const a = account()
    await Contact.create(base(a, { email: 'a@b.co' }))
    await expect(Contact.create(base(a, { email: 'a@b.co' }))).rejects.toMatchObject({ code: 11000 })
  })

  it('allows the same email in different accounts', async () => {
    await Contact.create(base(account(), { email: 'a@b.co' }))
    await expect(Contact.create(base(account(), { email: 'a@b.co' }))).resolves.toBeDefined()
  })

  it('allows many contacts without an email', async () => {
    const a = account()
    await Contact.create(base(a))
    await expect(Contact.create(base(a))).resolves.toBeDefined()
  })

  it('stores lowercased emails', async () => {
    const c = await Contact.create(base(account(), { email: 'A@B.CO' }))
    expect(c.email).toBe('a@b.co')
  })
})

describe('transactions', () => {
  it('roll back writes when the work throws', async () => {
    const a = account()
    await expect(
      mongoose.connection.transaction(async (session) => {
        await Contact.create([base(a)], { session })
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(await Contact.countDocuments({ accountId: a })).toBe(0)
  })
})
