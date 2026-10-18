import type { Tag } from '@/types/api'
import { request } from './client'

export const tagsApi = {
  list: (signal?: AbortSignal) => request<Tag[]>('/api/tags', { signal }),
}
