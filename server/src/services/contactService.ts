import { AppError } from '../errors/AppError.js'
import { derivedFields } from '../models/derived.js'
import type { ContactDoc } from '../models/Contact.js'
import { activityRepository } from '../repositories/activityRepository.js'
import { contactRepository } from '../repositories/contactRepository.js'
import { tagRepository } from '../repositories/tagRepository.js'
import { toContactDto } from '../serializers.js'
import type { ActivityChange, Contact, ContactFormValues, ContactListResponse, ListQuery } from '../types/api.js'
import type { UpdateInput } from '../types/domain.js'
import { EDITABLE_FIELDS, validateMergedContact } from '../validators/contact.js'
import { tagKey } from '../validators/tag.js'
import { withTransaction } from './transaction.js'

const toFormValues = (c: ContactDoc): ContactFormValues => ({
  firstName: c.firstName,
  lastName: c.lastName ?? '',
  email: c.email ?? '',
  phone: c.phone ?? '',
  company: c.company ?? '',
})

export const contactService = {
  async list(accountId: string, q: ListQuery): Promise<ContactListResponse> {
    // The URL may say "vip"; contacts store the catalogue's canonical "VIP". Unknown tags match nothing.
    const tagNames = q.tags.length ? (await tagRepository.findByKeys(accountId, q.tags.map(tagKey))).map((t) => t.name) : null
    const { docs, total } = await contactRepository.list(accountId, q, tagNames)
    return { data: docs.map(toContactDto), page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) }
  },

  async get(accountId: string, id: string): Promise<Contact> {
    const doc = await contactRepository.findById(accountId, id)
    if (!doc) throw AppError.notFound()
    return toContactDto(doc)
  },

  /**
   * Field edit with optimistic concurrency: a stale version is a conflict (409 with the latest copy),
   * a no-op changes nothing, email stays unique, and the change and its activity commit together.
   */
  update(accountId: string, id: string, { version, patch }: UpdateInput): Promise<Contact> {
    return withTransaction(async (session) => {
      const current = await contactRepository.findById(accountId, id, session)
      if (!current) throw AppError.notFound()

      const merged = { ...toFormValues(current), ...patch }
      const errors = Object.fromEntries(Object.entries(validateMergedContact(merged)).filter(([f]) => f in patch))
      if (Object.keys(errors).length) throw AppError.validation(errors)

      // Any newer version is a conflict, even for a no-op or non-overlapping fields.
      if (version !== current.version) throw AppError.versionConflict(toContactDto(current))

      const changes: ActivityChange[] = []
      for (const field of EDITABLE_FIELDS) {
        if (!(field in patch)) continue
        const to = patch[field] || null
        const from = current[field] ?? null
        if (to !== from) changes.push({ field, from, to })
      }
      if (!changes.length) return toContactDto(current)

      const email = changes.find((c) => c.field === 'email')?.to
      // Friendly pre-check; the unique index is the real guarantee (a racing 11000 maps to EMAIL_TAKEN).
      if (email && (await contactRepository.findOtherByEmail(accountId, email, id, session))) throw AppError.emailTaken()

      const set: Record<string, unknown> = {}
      const unset: string[] = []
      for (const { field, to } of changes) {
        if (to === null) unset.push(field)
        else set[field] = to
      }
      const stored = { firstName: merged.firstName, lastName: merged.lastName || null, phone: merged.phone || null, company: merged.company || null }
      Object.assign(set, derivedFields(stored))

      const updated = await contactRepository.updateIfVersion(accountId, id, version, set, unset, session)
      if (!updated) {
        const latest = await contactRepository.findById(accountId, id, session)
        if (!latest) throw AppError.notFound()
        throw AppError.versionConflict(toContactDto(latest))
      }
      await activityRepository.insertMany([{ accountId, contactId: id, type: 'CONTACT_UPDATED', changes, source: 'single' }], session)
      return toContactDto(updated)
    })
  },
}
