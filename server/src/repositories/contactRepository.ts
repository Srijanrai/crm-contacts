import type { ClientSession, QueryFilter, SortOrder } from 'mongoose'
import { Contact, type ContactDoc } from '../models/Contact.js'
import type { ListQuery, SortKey } from '../types/api.js'
import { prefix } from '../utils/regex.js'
import { digitsOnly, PHONE_QUERY_RE } from '../validators/common.js'
import { LIMITS } from '../validators/limits.js'

/** Matches only contacts below the tag limit: "tags.19" exists once a contact has 20 tags. */
const BELOW_TAG_LIMIT = { [`tags.${LIMITS.tagsPerContact - 1}`]: { $exists: false } }

const SORTS: Record<SortKey, Record<string, SortOrder>> = {
  name: { searchName: 1, _id: 1 },
  '-name': { searchName: -1, _id: -1 },
  createdAt: { createdAt: 1, _id: 1 },
  '-createdAt': { createdAt: -1, _id: -1 },
}

/**
 * Search: anchored prefixes on lowercase copies, as an $or whose every branch carries accountId,
 * so each branch uses its own { accountId, field } index. accountId is deliberately NOT repeated at
 * the top level: the planner would fold it into one accountId-prefixed scan of the whole account.
 * Every branch still includes accountId, so tenant scoping is unchanged. The email branch also
 * states $type: 'string': the email index is partial, and the planner only uses a partial index
 * when the query implies its filter. Phone digits are searched only when the text looks like one.
 */
function listFilter(accountId: string, q: ListQuery, tagNames: string[] | null): QueryFilter<ContactDoc> {
  const filter: QueryFilter<ContactDoc> = {}
  if (q.q) {
    const text = prefix(q.q.toLowerCase())
    const or: QueryFilter<ContactDoc>[] = [
      { accountId, searchName: text },
      { accountId, searchLastName: text },
      { accountId, email: { $regex: text, $type: 'string' } },
    ]
    const digits = digitsOnly(q.q)
    if (PHONE_QUERY_RE.test(q.q) && digits) or.push({ accountId, phoneDigits: prefix(digits) })
    filter.$or = or
  } else {
    filter.accountId = accountId
  }
  if (tagNames) filter.tags = { $in: tagNames }
  if (q.company) filter.companyLower = prefix(q.company.toLowerCase())
  return filter
}

/** Uses the partial unique email index (hence $type), so the uniqueness pre-check is one index lookup. */
const otherByEmailFilter = (accountId: string, email: string, excludeId: string): QueryFilter<ContactDoc> => ({
  accountId,
  email: { $eq: email, $type: 'string' },
  _id: { $ne: excludeId },
})

export const contactRepository = {
  listFilter,
  otherByEmailFilter,

  async list(accountId: string, q: ListQuery, tagNames: string[] | null): Promise<{ docs: ContactDoc[]; total: number }> {
    const filter = listFilter(accountId, q, tagNames)
    const [docs, total] = await Promise.all([
      Contact.find(filter)
        .sort(SORTS[q.sort])
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .lean<ContactDoc[]>(),
      Contact.countDocuments(filter),
    ])
    return { docs, total }
  },

  findById: (accountId: string, id: string, session?: ClientSession): Promise<ContactDoc | null> =>
    Contact.findOne({ _id: id, accountId }, null, { session }).lean<ContactDoc>(),

  findOtherByEmail: (accountId: string, email: string, excludeId: string, session: ClientSession) =>
    Contact.exists(otherByEmailFilter(accountId, email, excludeId)).session(session),

  /**
   * The optimistic-concurrency write: matches only while the stored version is still the one the
   * client edited, and bumps it atomically. Null means "not found or changed meanwhile".
   */
  updateIfVersion: (
    accountId: string,
    id: string,
    version: number,
    set: Record<string, unknown>,
    unset: string[],
    session: ClientSession,
  ): Promise<ContactDoc | null> =>
    Contact.findOneAndUpdate(
      { _id: id, accountId, version },
      { $set: set, ...(unset.length && { $unset: Object.fromEntries(unset.map((f) => [f, 1])) }), $inc: { version: 1 } },
      { returnDocument: 'after', session, runValidators: true },
    ).lean<ContactDoc>(),

  /** Adds a tag atomically if absent and below the limit; never touches version (tags can't overwrite edits). */
  pushTag: (accountId: string, id: string, name: string, session: ClientSession): Promise<ContactDoc | null> =>
    Contact.findOneAndUpdate(
      { _id: id, accountId, tags: { $ne: name }, ...BELOW_TAG_LIMIT },
      { $push: { tags: name } },
      { returnDocument: 'after', session },
    ).lean<ContactDoc>(),

  pullTag: (accountId: string, id: string, name: string, session: ClientSession): Promise<ContactDoc | null> =>
    Contact.findOneAndUpdate({ _id: id, accountId, tags: name }, { $pull: { tags: name } }, { returnDocument: 'after', session }).lean<ContactDoc>(),

  findTagsForIds: (accountId: string, ids: string[], session?: ClientSession) =>
    Contact.find({ accountId, _id: { $in: ids } }, { tags: 1 }, { session }).lean<{ _id: ContactDoc['_id']; tags: string[] }[]>(),

  /** Bulk version of pushTag; returns how many contacts changed. */
  async pushTagMany(accountId: string, ids: string[], name: string, session: ClientSession): Promise<number> {
    const res = await Contact.updateMany(
      { accountId, _id: { $in: ids }, tags: { $ne: name }, ...BELOW_TAG_LIMIT },
      { $push: { tags: name } },
      { session },
    )
    return res.modifiedCount
  },
}
