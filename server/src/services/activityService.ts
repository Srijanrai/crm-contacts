import { AppError } from '../errors/AppError.js'
import { activityRepository } from '../repositories/activityRepository.js'
import { contactRepository } from '../repositories/contactRepository.js'
import { toActivityDto } from '../serializers.js'
import type { ActivityPage } from '../types/api.js'

export const activityService = {
  async list(accountId: string, contactId: string, { limit, before }: { limit: number; before?: string }): Promise<ActivityPage> {
    if (!(await contactRepository.findById(accountId, contactId))) throw AppError.notFound()
    let cursor
    if (before) {
      cursor = await activityRepository.findOne(accountId, contactId, before)
      if (!cursor) throw AppError.validation({ before: 'Invalid cursor' })
    }
    const docs = await activityRepository.listForContact(accountId, contactId, limit, cursor ?? undefined)
    const page = docs.slice(0, limit)
    return { data: page.map(toActivityDto), nextCursor: docs.length > limit ? page[page.length - 1]._id.toString() : null }
  },
}
