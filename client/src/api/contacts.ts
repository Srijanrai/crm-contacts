import type { BulkTagInput, BulkTagResult, Contact, ContactListResponse, ListQuery, UpdateContactInput } from '@/types/api'
import { request } from './client'

/** API params: empty filters omitted; sort, page and limit always explicit. */
function listParams(q: ListQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (q.q) params.set('q', q.q)
  if (q.tags.length) params.set('tags', q.tags.join(','))
  if (q.company) params.set('company', q.company)
  params.set('sort', q.sort)
  params.set('page', String(q.page))
  params.set('limit', String(q.limit))
  return params
}

const contactPath = (id: string) => `/api/contacts/${encodeURIComponent(id)}`

export const contactsApi = {
  list: (q: ListQuery, signal?: AbortSignal) =>
    request<ContactListResponse>('/api/contacts', { query: listParams(q), signal }),
  get: (id: string, signal?: AbortSignal) => request<Contact>(contactPath(id), { signal }),
  update: (id: string, input: UpdateContactInput) => request<Contact>(contactPath(id), { method: 'PATCH', body: input }),
  addTag: (id: string, tag: string) => request<Contact>(`${contactPath(id)}/tags`, { method: 'POST', body: { tag } }),
  removeTag: (id: string, tag: string) =>
    request<Contact>(`${contactPath(id)}/tags/${encodeURIComponent(tag)}`, { method: 'DELETE' }),
  bulkTag: (input: BulkTagInput) => request<BulkTagResult>('/api/contacts/bulk/tags', { method: 'POST', body: input }),
}
