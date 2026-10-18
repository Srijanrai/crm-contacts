import type { ClientSession } from 'mongoose'
import { Tag, type TagDoc } from '../models/Tag.js'
import { tagKey } from '../validators/tag.js'

const isDuplicateKey = (e: unknown) => (e as { code?: number })?.code === 11000

export const tagRepository = {
  findByKeys: (accountId: string, keys: string[], session?: ClientSession): Promise<TagDoc[]> =>
    Tag.find({ accountId, key: { $in: keys } }, null, { session }).lean<TagDoc[]>(),

  list: (accountId: string): Promise<TagDoc[]> => Tag.find({ accountId }).sort({ key: 1 }).lean<TagDoc[]>(),

  /**
   * Returns the catalogue entry for this name, creating it on first use. Runs outside the contact
   * transaction (a duplicate-key error would abort it); a racing creator's entry is simply reused.
   */
  async upsertByName(accountId: string, name: string): Promise<TagDoc> {
    const key = tagKey(name)
    try {
      return (await Tag.findOneAndUpdate(
        { accountId, key },
        { $setOnInsert: { accountId, key, name } },
        { upsert: true, returnDocument: 'after' },
      ).lean<TagDoc>())!
    } catch (e) {
      if (!isDuplicateKey(e)) throw e
      return (await Tag.findOne({ accountId, key }).lean<TagDoc>())!
    }
  },
}
