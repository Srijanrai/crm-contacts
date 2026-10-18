import type { ActivityDoc } from './models/Activity.js'
import type { ContactDoc } from './models/Contact.js'
import type { Activity, Contact } from './types/api.js'

/** Document → API shape: absent optionals become null, dates ISO strings, derived fields dropped. */
export function toContactDto(doc: ContactDoc): Contact {
  return {
    id: doc._id.toString(),
    firstName: doc.firstName,
    lastName: doc.lastName ?? null,
    email: doc.email ?? null,
    phone: doc.phone ?? null,
    company: doc.company ?? null,
    tags: doc.tags,
    version: doc.version,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

export function toActivityDto(doc: ActivityDoc): Activity {
  const dto: Activity = {
    id: doc._id.toString(),
    contactId: doc.contactId.toString(),
    type: doc.type,
    createdAt: doc.createdAt.toISOString(),
    source: doc.source,
  }
  if (doc.changes) dto.changes = doc.changes.map(({ field, from, to }) => ({ field, from: from ?? null, to: to ?? null }))
  if (doc.tag !== undefined) dto.tag = doc.tag
  return dto
}
