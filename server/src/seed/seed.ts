import { en, Faker } from '@faker-js/faker'
import mongoose from 'mongoose'
import { ensureIndexes } from '../config/db.js'
import { Account } from '../models/Account.js'
import { Activity } from '../models/Activity.js'
import { Contact } from '../models/Contact.js'
import { derivedFields } from '../models/derived.js'
import { Tag } from '../models/Tag.js'
import { tagKey } from '../validators/tag.js'

export const SEED_TAGS = ['Lead', 'Customer', 'VIP', 'Prospect', 'Partner', 'Churned']
const DAY = 24 * 60 * 60 * 1000
const BATCH = 1000

/** The seed wipes collections: only allowed on localhost unless --yes is passed. */
export function assertSafeTarget(uri: string, argv: string[]): void {
  const host = uri.replace(/^mongodb(\+srv)?:\/\/([^@/]*@)?/, '').split(/[/:,?]/)[0]
  if (host === 'localhost' || host === '127.0.0.1' || argv.includes('--yes')) return
  throw new Error('Refusing to wipe a non-local database without --yes')
}

/** `--count=N` (2–100,000; the two Smiths are always included); defaults to 5,000. */
export function parseSeedCount(argv: string[]): number {
  const arg = argv.find((a) => a.startsWith('--count='))
  if (!arg) return 5000
  const n = Number(arg.slice('--count='.length))
  if (!Number.isInteger(n) || n < 2 || n > 100_000) throw new Error('--count must be a whole number from 2 to 100000')
  return n
}

async function dropAll() {
  for (const model of [Account, Contact, Tag, Activity]) {
    try {
      await model.collection.drop()
    } catch (e) {
      if ((e as { codeName?: string }).codeName !== 'NamespaceNotFound') throw e
    }
  }
}

/**
 * Resets the database to reproducible demo data (same seed → same people), mirroring the
 * frontend mock's distributions (client/src/mocks/seed.ts) at 5,000 contacts.
 * Contacts and activities are inserted with the raw driver so the historical
 * createdAt/updatedAt values are kept as generated.
 */
export async function seedDatabase(opts: { accountId: string; count?: number; seed?: number }) {
  const { count = 5000, seed = 42 } = opts
  const accountId = new mongoose.Types.ObjectId(opts.accountId)
  const f = new Faker({ locale: [en] })
  f.seed(seed)
  const now = Date.now()

  await dropAll()
  await ensureIndexes()
  await Account.create({ _id: accountId, name: 'Demo Account' })
  await Tag.insertMany(SEED_TAGS.map((name) => ({ accountId, name, key: tagKey(name) })))

  const companies = [...new Set(Array.from({ length: 80 }, () => f.company.name()))].slice(0, 60)
  const emails = new Set<string>()
  const n = (len: number) => f.string.numeric({ length: len, allowLeadingZeros: false })
  const phone = () =>
    f.helpers.arrayElement([
      () => `(${n(3)}) ${n(3)}-${n(4)}`,
      () => `+1 ${n(3)} ${n(3)} ${n(4)}`,
      () => `+44 20 ${n(4)} ${n(4)}`,
      () => `+91 ${n(5)} ${n(5)}`,
      () => `${n(3)}.${n(3)}.${n(4)}`,
    ])()

  const makeContact = (firstName: string, lastName: string | null) => {
    const createdMs = now - f.number.int({ min: 0, max: 730 }) * DAY - f.number.int({ min: 0, max: DAY })
    const doc: Record<string, unknown> = {
      _id: new mongoose.Types.ObjectId(),
      accountId,
      firstName,
      tags: f.helpers.arrayElements(SEED_TAGS, { min: 0, max: 3 }),
      version: 1,
      createdAt: new Date(createdMs),
      updatedAt: new Date(createdMs + f.number.int({ min: 0, max: now - createdMs })),
    }
    if (lastName) doc.lastName = lastName
    if (f.number.float() > 0.08) {
      const base = `${firstName}.${lastName ?? 'contact'}`.toLowerCase().replace(/[^a-z.]/g, '')
      const domain = f.internet.domainName()
      let email = `${base}@${domain}`
      for (let i = 2; emails.has(email); i++) email = `${base}${i}@${domain}`
      emails.add(email)
      doc.email = email
    }
    if (f.number.float() > 0.1) doc.phone = phone()
    if (f.number.float() > 0.06) doc.company = f.helpers.arrayElement(companies)
    Object.assign(doc, derivedFields(doc as { firstName: string }))
    return doc
  }

  const contacts = [makeContact('Jon', 'Smith'), makeContact('John', 'Smith')]
  while (contacts.length < count) contacts.push(makeContact(f.person.firstName(), f.number.float() > 0.05 ? f.person.lastName() : null))

  // Activity for the first 50 contacts, generated backwards from each contact's current state so
  // the history is consistent: a field's latest change ends at its current value, and a tag is
  // only ever removed after it was added. The first contact gets 30 entries (for "Load more").
  type FieldName = 'company' | 'phone' | 'lastName' | 'email'
  const fakeValue = (field: FieldName, c: Record<string, unknown>): string | null => {
    if (f.number.float() < 0.15) return null // the field was empty before
    if (field === 'company') return f.helpers.arrayElement(companies)
    if (field === 'phone') return phone()
    if (field === 'lastName') return f.person.lastName()
    return `${String(c.firstName).toLowerCase()}.${f.word.noun()}@${f.internet.domainName()}`
  }
  const activities: Record<string, unknown>[] = []
  contacts.slice(0, 50).forEach((c, i) => {
    const state: Record<FieldName, string | null> = {
      company: (c.company as string) ?? null,
      phone: (c.phone as string) ?? null,
      lastName: (c.lastName as string) ?? null,
      email: (c.email as string) ?? null,
    }
    const tags = new Set(c.tags as string[])
    const start = (c.createdAt as Date).getTime()
    const howMany = i === 0 ? 30 : f.number.int({ min: 1, max: 6 })
    const times = Array.from({ length: howMany }, () => f.number.int({ min: start, max: now })).sort((a, b) => b - a) // newest first
    times.forEach((t, k) => {
      const base = { _id: new mongoose.Types.ObjectId(), accountId, contactId: c._id, createdAt: new Date(t), source: 'single' }
      const kind = f.helpers.arrayElement(['update', 'tag'] as const)
      if (kind === 'update') {
        const field = f.helpers.arrayElement(['company', 'phone', 'lastName', 'email'] as const)
        const to = state[field]
        let from = fakeValue(field, c)
        if (from === to) from = null
        if (from === to) return // both empty: nothing changed
        activities.push({ ...base, type: 'CONTACT_UPDATED', changes: [{ field, from, to }] })
        state[field] = from // step back in time
      } else {
        // Walking backwards: a tag it has now was added here. A tag it lacks now was removed here,
        // after being added a little earlier, so every removal follows a recorded add.
        const tag = f.helpers.arrayElement(SEED_TAGS)
        if (tags.has(tag)) {
          activities.push({ ...base, type: 'TAG_ADDED', tag })
          tags.delete(tag)
        } else {
          activities.push({ ...base, type: 'TAG_REMOVED', tag })
          // Strictly between this removal and the next older event, so nothing else falls in between.
          const older = times[k + 1] ?? start
          const addedAt = older + Math.max(1, Math.floor((t - older) * f.number.float({ min: 0.2, max: 0.8 })))
          activities.push({ ...base, _id: new mongoose.Types.ObjectId(), type: 'TAG_ADDED', tag, createdAt: new Date(addedAt) })
        }
      }
    })
    // The contact must have been updated at least as recently as its latest activity.
    if (times.length && times[0] > (c.updatedAt as Date).getTime()) c.updatedAt = new Date(times[0])
  })

  for (let i = 0; i < contacts.length; i += BATCH) await Contact.collection.insertMany(contacts.slice(i, i + BATCH))
  if (activities.length) await Activity.collection.insertMany(activities)

  return { contacts: contacts.length, activities: activities.length, tags: SEED_TAGS.length }
}
