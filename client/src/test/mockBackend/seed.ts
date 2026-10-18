import { en, Faker } from '@faker-js/faker'
import type { Activity, Contact, EditableField } from '@/types/api'
import type { MockState } from './db'

export const SEED_TAGS = ['Lead', 'Customer', 'VIP', 'Prospect', 'Partner', 'Churned']
const DAY = 24 * 60 * 60 * 1000

/** Deterministic demo data: same seed, same people, companies and tags. */
export function seedData(count = 1000, seed = 42): MockState {
  const f = new Faker({ locale: [en] })
  f.seed(seed)
  const now = Date.now()
  const companies = Array.from(new Set(Array.from({ length: 80 }, () => f.company.name()))).slice(0, 60)
  const emails = new Set<string>()
  let activitySeq = 0
  const nextActivityId = () => (activitySeq++).toString(16).padStart(24, '0')

  const phone = (): string => {
    const n = (len: number) => f.string.numeric({ length: len, allowLeadingZeros: false })
    return f.helpers.arrayElement([
      () => `(${n(3)}) ${n(3)}-${n(4)}`,
      () => `+1 ${n(3)} ${n(3)} ${n(4)}`,
      () => `+44 20 ${n(4)} ${n(4)}`,
      () => `+91 ${n(5)} ${n(5)}`,
      () => `${n(3)}.${n(3)}.${n(4)}`,
    ])()
  }

  const makeContact = (firstName: string, lastName: string | null): Contact => {
    const createdMs = now - f.number.int({ min: 0, max: 730 }) * DAY - f.number.int({ min: 0, max: DAY })
    const updatedMs = createdMs + f.number.int({ min: 0, max: now - createdMs })
    let email: string | null = null
    if (f.number.float() > 0.08) {
      const base = `${firstName}.${lastName ?? 'contact'}`.toLowerCase().replace(/[^a-z.]/g, '')
      const domain = f.internet.domainName()
      email = `${base}@${domain}`
      for (let i = 2; emails.has(email); i++) email = `${base}${i}@${domain}`
      emails.add(email)
    }
    return {
      id: f.database.mongodbObjectId(),
      firstName,
      lastName,
      email,
      phone: f.number.float() > 0.1 ? phone() : null,
      company: f.number.float() > 0.06 ? f.helpers.arrayElement(companies) : null,
      tags: f.helpers.arrayElements(SEED_TAGS, { min: 0, max: 3 }),
      version: 1,
      createdAt: new Date(createdMs).toISOString(),
      updatedAt: new Date(updatedMs).toISOString(),
    }
  }

  const contacts: Contact[] = [makeContact('Jon', 'Smith'), makeContact('John', 'Smith')]
  while (contacts.length < count) {
    const lastName = f.number.float() > 0.05 ? f.person.lastName() : null
    contacts.push(makeContact(f.person.firstName(), lastName))
  }

  const activities: Activity[] = []
  const fields: EditableField[] = ['company', 'phone', 'email', 'lastName']
  contacts.slice(0, 20).forEach((c, i) => {
    const howMany = i === 0 ? 30 : f.number.int({ min: 1, max: 6 })
    const start = new Date(c.createdAt).getTime()
    const times = Array.from({ length: howMany }, () => f.number.int({ min: start, max: now })).sort((a, b) => a - b)
    for (const t of times) {
      const kind = f.helpers.arrayElement(['update', 'add', 'remove'] as const)
      const base = { id: nextActivityId(), contactId: c.id, createdAt: new Date(t).toISOString(), source: 'single' as const }
      if (kind === 'update') {
        const field = f.helpers.arrayElement(fields)
        activities.push({ ...base, type: 'CONTACT_UPDATED', changes: [{ field, from: f.word.noun(), to: f.word.noun() }] })
      } else {
        activities.push({ ...base, type: kind === 'add' ? 'TAG_ADDED' : 'TAG_REMOVED', tag: f.helpers.arrayElement(SEED_TAGS) })
      }
    }
  })

  return { contacts, tags: [...SEED_TAGS], activities, activitySeq }
}
