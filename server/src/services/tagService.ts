import { AppError } from '../errors/AppError.js'
import { activityRepository } from '../repositories/activityRepository.js'
import { contactRepository } from '../repositories/contactRepository.js'
import { tagRepository } from '../repositories/tagRepository.js'
import { toContactDto } from '../serializers.js'
import type { BulkTagInput, BulkTagResult, Contact, Tag } from '../types/api.js'
import { LIMITS } from '../validators/limits.js'
import { tagKey } from '../validators/tag.js'
import { withTransaction } from './transaction.js'

export const tagService = {
  async list(accountId: string): Promise<Tag[]> {
    return (await tagRepository.list(accountId)).map((t) => ({ name: t.name }))
  },

  /** Idempotent, case-insensitive add; never bumps version; at most 20 tags per contact. */
  async addToContact(accountId: string, id: string, rawTag: string): Promise<Contact> {
    const existing = await contactRepository.findById(accountId, id)
    if (!existing) throw AppError.notFound()
    const key = tagKey(rawTag)
    if (existing.tags.some((t) => tagKey(t) === key)) return toContactDto(existing)
    if (existing.tags.length >= LIMITS.tagsPerContact) throw AppError.tagLimit()

    const { name } = await tagRepository.upsertByName(accountId, rawTag)
    return withTransaction(async (session) => {
      const updated = await contactRepository.pushTag(accountId, id, name, session)
      if (!updated) {
        // Changed meanwhile: decide from the latest state.
        const latest = await contactRepository.findById(accountId, id, session)
        if (!latest) throw AppError.notFound()
        if (latest.tags.includes(name)) return toContactDto(latest)
        throw AppError.tagLimit()
      }
      await activityRepository.insertMany([{ accountId, contactId: id, type: 'TAG_ADDED', tag: name, source: 'single' }], session)
      return toContactDto(updated)
    })
  },

  /** Idempotent, case-insensitive remove. */
  removeFromContact(accountId: string, id: string, rawTag: string): Promise<Contact> {
    return withTransaction(async (session) => {
      const contact = await contactRepository.findById(accountId, id, session)
      if (!contact) throw AppError.notFound()
      const name = contact.tags.find((t) => tagKey(t) === tagKey(rawTag))
      if (!name) return toContactDto(contact)
      const updated = await contactRepository.pullTag(accountId, id, name, session)
      if (!updated) return toContactDto((await contactRepository.findById(accountId, id, session)) ?? contact)
      await activityRepository.insertMany([{ accountId, contactId: id, type: 'TAG_REMOVED', tag: name, source: 'single' }], session)
      return toContactDto(updated)
    })
  },

  /** Bulk assignment: one transaction, one TAG_ADDED per contact that changed, counts for the rest. */
  async bulkAssign(accountId: string, { contactIds, tag }: BulkTagInput): Promise<BulkTagResult> {
    const [existing] = await tagRepository.findByKeys(accountId, [tagKey(tag)])
    if (!existing) {
      // A brand-new tag joins the catalogue only if at least one contact can receive it;
      // otherwise the tag filter would offer a tag that matches nothing.
      const found = await contactRepository.findTagsForIds(accountId, contactIds)
      if (!found.some((c) => c.tags.length < LIMITS.tagsPerContact)) return classify(contactIds, found, tag).result
    }
    const name = existing?.name ?? (await tagRepository.upsertByName(accountId, tag)).name
    return withTransaction(async (session) => {
      const { result, toUpdate } = classify(contactIds, await contactRepository.findTagsForIds(accountId, contactIds, session), name)
      if (toUpdate.length) {
        await contactRepository.pushTagMany(accountId, toUpdate, name, session)
        await activityRepository.insertMany(
          toUpdate.map((contactId) => ({ accountId, contactId, type: 'TAG_ADDED' as const, tag: name, source: 'bulk' as const })),
          session,
        )
      }
      return result
    })
  },
}

/** Sorts the requested ids into the bulk result buckets, in request order. */
function classify(contactIds: string[], found: { _id: { toString(): string }; tags: string[] }[], name: string) {
  const tagsById = new Map(found.map((c) => [c._id.toString(), c.tags]))
  const result: BulkTagResult = { tag: name, requested: contactIds.length, updated: 0, alreadyTagged: 0, notFound: [], skipped: [] }
  const toUpdate: string[] = []
  for (const id of contactIds) {
    const tags = tagsById.get(id)
    // Ids from another account are indistinguishable from missing ones.
    if (!tags) result.notFound.push(id)
    else if (tags.includes(name)) result.alreadyTagged++
    else if (tags.length >= LIMITS.tagsPerContact) result.skipped.push(id)
    else toUpdate.push(id)
  }
  result.updated = toUpdate.length
  return { result, toUpdate }
}
