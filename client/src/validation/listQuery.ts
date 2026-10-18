import type { ListQuery, SortKey } from '@/types/api'
import { LIMITS } from './limits'

export { LIMITS, PAGE_SIZE_OPTIONS } from './limits'

export const SORT_KEYS: readonly SortKey[] = ['name', '-name', 'createdAt', '-createdAt']

export const DEFAULT_LIST_QUERY: ListQuery = {
  q: '',
  tags: [],
  company: '',
  sort: '-createdAt',
  page: 1,
  limit: 20,
}

/** Positive integer small enough to be exact (a 20-digit page number would round and break the API call). */
const parsePositiveInt = (raw: string): number | null => {
  if (!/^\d+$/.test(raw)) return null
  const n = Number(raw)
  return Number.isSafeInteger(n) && n >= 1 ? n : null
}

const splitTags = (raw: string): string[] =>
  raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

/**
 * Parses list params from the URL. Invalid values fall back to their default
 * and their names are reported, so the caller can clean the URL and tell the user.
 */
export function parseListQuery(params: URLSearchParams): { query: ListQuery; invalid: string[] } {
  const query: ListQuery = { ...DEFAULT_LIST_QUERY, tags: [] }
  const invalid: string[] = []

  const q = params.get('q')
  if (q !== null) {
    const trimmed = q.trim()
    if (trimmed.length > LIMITS.searchMax) invalid.push('q')
    else query.q = trimmed
  }

  const tags = params.get('tags')
  if (tags !== null) {
    const list = splitTags(tags)
    if (list.length > LIMITS.tagFilterMax) invalid.push('tags')
    else query.tags = list
  }

  const company = params.get('company')
  if (company !== null) query.company = company.trim()

  const sort = params.get('sort')
  if (sort !== null) {
    if ((SORT_KEYS as readonly string[]).includes(sort)) query.sort = sort as SortKey
    else invalid.push('sort')
  }

  const page = params.get('page')
  if (page !== null) {
    const n = parsePositiveInt(page)
    if (n === null) invalid.push('page')
    else query.page = n
  }

  const limit = params.get('limit')
  if (limit !== null) {
    const n = parsePositiveInt(limit)
    if (n === null || n > LIMITS.limitMax) invalid.push('limit')
    else query.limit = n
  }

  return { query, invalid }
}

/** Serialises a list query, omitting defaults so URLs stay short. */
export function serializeListQuery(query: ListQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.q) params.set('q', query.q)
  if (query.tags.length) params.set('tags', query.tags.join(','))
  if (query.company) params.set('company', query.company)
  if (query.sort !== DEFAULT_LIST_QUERY.sort) params.set('sort', query.sort)
  if (query.page !== DEFAULT_LIST_QUERY.page) params.set('page', String(query.page))
  if (query.limit !== DEFAULT_LIST_QUERY.limit) params.set('limit', String(query.limit))
  return params
}
