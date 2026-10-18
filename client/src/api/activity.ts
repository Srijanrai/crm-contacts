import type { ActivityPage } from '@/types/api'
import { request } from './client'

export const activityApi = {
  list: (contactId: string, opts: { limit?: number; before?: string } = {}, signal?: AbortSignal) => {
    const query = new URLSearchParams()
    if (opts.limit) query.set('limit', String(opts.limit))
    if (opts.before) query.set('before', opts.before)
    return request<ActivityPage>(`/api/contacts/${encodeURIComponent(contactId)}/activity`, { query, signal })
  },
}
