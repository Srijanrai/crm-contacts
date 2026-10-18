import mongoose from 'mongoose'
import { Account } from '../models/Account.js'
import { Contact, type ContactDoc } from '../models/Contact.js'
import { derivedFields } from '../models/derived.js'
import { Tag } from '../models/Tag.js'
import { tagKey } from '../validators/tag.js'

let n = 0

export async function createAccount(id?: string, name = 'Test Account'): Promise<string> {
  const _id = id ? new mongoose.Types.ObjectId(id) : new mongoose.Types.ObjectId()
  await Account.create({ _id, name })
  return _id.toString()
}

type ContactInput = Partial<Pick<ContactDoc, 'firstName' | 'lastName' | 'email' | 'phone' | 'company' | 'tags' | 'createdAt'>>

/** Inserts a contact the way the repository would (derived fields set, tags in the catalogue). */
export async function createContact(accountId: string, overrides: ContactInput = {}): Promise<ContactDoc> {
  n++
  const values = {
    firstName: `First${n}`,
    lastName: `Last${n}`,
    email: `person${n}@example.com`,
    phone: '+1 555 010 0000',
    company: 'Acme',
    tags: [] as string[],
    ...overrides,
  }
  for (const name of values.tags) {
    await Tag.updateOne({ accountId, key: tagKey(name) }, { $setOnInsert: { name } }, { upsert: true })
  }
  const doc: Record<string, unknown> = { accountId, ...values, ...derivedFields(values) }
  for (const k of ['lastName', 'email', 'phone', 'company'] as const) if (values[k] == null) delete doc[k]
  const created = await Contact.create(doc)
  return created.toObject() as ContactDoc
}
