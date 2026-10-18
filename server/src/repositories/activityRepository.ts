import { Types, type ClientSession } from 'mongoose'
import { Activity, type ActivityDoc } from '../models/Activity.js'

export type NewActivity = Omit<ActivityDoc, '_id' | 'createdAt' | 'accountId' | 'contactId'> & {
  accountId: string
  contactId: string
}

export const activityRepository = {
  async insertMany(docs: NewActivity[], session: ClientSession): Promise<void> {
    if (docs.length) await Activity.insertMany(docs, { session })
  },

  findOne: (accountId: string, contactId: string, id: string) =>
    Activity.findOne({ _id: id, accountId, contactId }).lean<ActivityDoc>(),

  /** Newest first; fetches limit + 1 so the caller can tell whether another page exists. */
  listForContact(accountId: string, contactId: string, limit: number, before?: { createdAt: Date; _id: Types.ObjectId }) {
    const filter: Record<string, unknown> = { accountId, contactId }
    if (before) {
      // Keyset cursor: strictly older, with _id breaking ties between equal timestamps.
      filter.$or = [{ createdAt: { $lt: before.createdAt } }, { createdAt: before.createdAt, _id: { $lt: before._id } }]
    }
    return Activity.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).lean<ActivityDoc[]>()
  },
}
