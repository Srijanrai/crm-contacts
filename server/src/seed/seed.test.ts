import mongoose from 'mongoose'
import { Account } from '../models/Account.js'
import { Activity } from '../models/Activity.js'
import { Contact } from '../models/Contact.js'
import { Tag } from '../models/Tag.js'
import { assertSafeTarget, seedDatabase } from './seed.js'

describe('assertSafeTarget', () => {
  it('refuses a remote database without --yes', () => {
    expect(() => assertSafeTarget('mongodb+srv://u:p@x.mongodb.net/crm', [])).toThrow('Refusing to wipe a non-local database without --yes')
    expect(() => assertSafeTarget('mongodb+srv://u:p@x.mongodb.net/crm', ['--yes'])).not.toThrow()
    expect(() => assertSafeTarget('mongodb://localhost:27017/crm?replicaSet=rs0', [])).not.toThrow()
    expect(() => assertSafeTarget('mongodb://127.0.0.1:27017/crm', [])).not.toThrow()
  })
})

describe('seedDatabase', () => {
  const accountId = new mongoose.Types.ObjectId().toString()

  it('creates the demo account, catalogue, contacts and activity', async () => {
    const counts = await seedDatabase({ accountId, count: 300 })
    expect(counts.contacts).toBe(300)
    expect(await Account.findById(accountId).lean()).toMatchObject({ name: 'Demo Account' })
    expect((await Tag.find({ accountId }).lean()).map((t) => t.name).sort()).toEqual(['Churned', 'Customer', 'Lead', 'Partner', 'Prospect', 'VIP'])
    expect(await Contact.countDocuments({ accountId })).toBe(300)
    expect(await Contact.exists({ accountId, firstName: 'Jon', lastName: 'Smith' })).not.toBeNull()
    expect(await Contact.exists({ accountId, firstName: 'John', lastName: 'Smith' })).not.toBeNull()
    const busiest = await Activity.aggregate([{ $group: { _id: '$contactId', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 1 }])
    expect(busiest[0].n).toBeGreaterThanOrEqual(21)
  })

  it('stores derived search fields and leaves missing optionals absent', async () => {
    await seedDatabase({ accountId, count: 300 })
    const noEmail = await Contact.findOne({ accountId, email: { $exists: false } }).lean()
    expect(noEmail).not.toBeNull()
    const jon = await Contact.findOne({ accountId, firstName: 'Jon' }).lean()
    expect(jon?.searchName).toBe('jon smith')
  })

  it('writes activity history that matches the contacts', async () => {
    await seedDatabase({ accountId, count: 300 })
    const contacts = new Map((await Contact.find({ accountId }).lean()).map((c) => [c._id.toString(), c]))
    const acts = await Activity.find({ accountId }).sort({ createdAt: 1, _id: 1 }).lean()
    const lastTo = new Map<string, string | null>()
    const tagState = new Map<string, boolean>()
    const badEmails: string[] = []
    const orphanRemovals: string[] = []
    for (const a of acts) {
      const id = a.contactId.toString()
      for (const ch of a.changes ?? []) {
        if (ch.field === 'email' && ch.to && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ch.to)) badEmails.push(ch.to)
        lastTo.set(`${id}:${ch.field}`, ch.to ?? null)
      }
      if (a.type === 'TAG_ADDED') tagState.set(`${id}:${a.tag}`, true)
      if (a.type === 'TAG_REMOVED') {
        if (tagState.get(`${id}:${a.tag}`) !== true) orphanRemovals.push(`${id}:${a.tag}`)
        tagState.set(`${id}:${a.tag}`, false)
      }
    }
    expect(badEmails).toEqual([])
    expect(orphanRemovals, 'tags removed without being added first').toEqual([])
    for (const [key, to] of lastTo) {
      const [id, field] = key.split(':') as [string, 'company' | 'phone' | 'lastName' | 'email']
      expect(contacts.get(id)?.[field] ?? null, key).toBe(to)
    }
    for (const [key, has] of tagState) {
      const [id, tag] = key.split(':')
      expect(contacts.get(id)?.tags.includes(tag), key).toBe(has)
    }
  })

  it('is a repeatable reset', async () => {
    const first = await seedDatabase({ accountId, count: 300 })
    const second = await seedDatabase({ accountId, count: 300 })
    expect(second).toEqual(first)
    expect(await Contact.countDocuments()).toBe(300)
  })
})

describe('parseSeedCount', () => {
  it('reads --count=N and defaults to 5000', async () => {
    const { parseSeedCount } = await import('./seed.js')
    expect(parseSeedCount([])).toBe(5000)
    expect(parseSeedCount(['--yes', '--count=100'])).toBe(100)
    expect(() => parseSeedCount(['--count=1'])).toThrow('--count must be a whole number from 2 to 100000')
    expect(() => parseSeedCount(['--count=abc'])).toThrow('--count must be a whole number from 2 to 100000')
  })
})
