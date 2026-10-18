import { delay, http, HttpResponse, type HttpResponseResolver, type JsonBodyType } from 'msw'
import type {
  Activity,
  ActivityChange,
  ApiErrorBody,
  BulkTagResult,
  Contact,
  ContactFormValues,
  EditableField,
  ErrorCode,
  Tag,
} from '@/types/api'
import { digitsOnly, validateContactForm } from '@/validation/contact'
import { LIMITS } from '@/validation/limits'
import { parseListQuery } from '@/validation/listQuery'
import { normalizeTagName, tagKey, validateTagName } from '@/validation/tag'
import type { MockDb, MockState } from './db'
import type { MockControls } from './devControls'

/**
 * Test-only mock of the API contract (see server/ for the real one), used by the frontend tests through MSW.
 * It enforces the same rules as the real backend (server/), so tests exercise real behaviour.
 * It is never loaded by the app.
 */

const EDITABLE: EditableField[] = ['firstName', 'lastName', 'email', 'phone', 'company']
const ID_RE = /^[a-f0-9]{24}$/
const PHONE_QUERY_RE = /^[+0-9 ().-]+$/

class MockHttpError extends Error {
  status: number
  code: ErrorCode
  fields?: Record<string, string>
  details?: { current?: Contact }
  constructor(status: number, code: ErrorCode, message: string, extra: { fields?: Record<string, string>; details?: { current?: Contact } } = {}) {
    super(message)
    this.status = status
    this.code = code
    this.fields = extra.fields
    this.details = extra.details
  }
}

const errorResponse = (e: MockHttpError) =>
  HttpResponse.json<ApiErrorBody>(
    { error: { code: e.code, message: e.message, fields: e.fields, details: e.details } },
    { status: e.status },
  )

const validationError = (fields: Record<string, string>) =>
  new MockHttpError(400, 'VALIDATION_ERROR', 'Invalid request', { fields })

const clone = <T,>(v: T): T => structuredClone(v)

function assertId(id: string) {
  if (!ID_RE.test(id)) throw new MockHttpError(400, 'INVALID_ID', 'Invalid contact id')
}

function findContact(state: MockState, id: string): Contact {
  assertId(id)
  const c = state.contacts.find((x) => x.id === id)
  if (!c) throw new MockHttpError(404, 'NOT_FOUND', 'Contact not found')
  return c
}

const fullNameKey = (c: Contact) => `${c.firstName} ${c.lastName ?? ''}`.trim().toLowerCase()
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

function addActivity(state: MockState, a: Omit<Activity, 'id' | 'createdAt'>) {
  state.activities.push({ ...a, id: (state.activitySeq++).toString(16).padStart(24, '0'), createdAt: new Date().toISOString() })
}

function canonicalTag(state: MockState, raw: string): string {
  const name = normalizeTagName(raw)
  const existing = state.tags.find((t) => tagKey(t) === tagKey(name))
  if (existing) return existing
  state.tags.push(name)
  return name
}

const toStored = (field: EditableField, value: string): string | null => {
  const v = value.trim()
  if (!v) return field === 'firstName' ? '' : null
  return field === 'email' ? v.toLowerCase() : v
}

const toForm = (c: Contact): ContactFormValues => ({
  firstName: c.firstName,
  lastName: c.lastName ?? '',
  email: c.email ?? '',
  phone: c.phone ?? '',
  company: c.company ?? '',
})

/** Shared by the PATCH handler and tests that simulate another user's edit. */
export function applyContactUpdate(state: MockState, id: string, body: unknown, opts: { checkVersion: boolean }): Contact {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw validationError({ body: 'Expected a JSON object' })
  const input = body as Record<string, unknown>
  const fieldErrors: Record<string, string> = {}
  for (const key of Object.keys(input)) {
    if (key !== 'version' && !EDITABLE.includes(key as EditableField)) fieldErrors[key] = 'Unknown field'
  }
  if (opts.checkVersion && (!Number.isInteger(input.version) || (input.version as number) < 1)) {
    fieldErrors.version = 'Version is required'
  }
  const patch: Partial<ContactFormValues> = {}
  for (const field of EDITABLE) {
    if (!(field in input)) continue
    const v = input[field]
    if (v === null) patch[field] = ''
    else if (typeof v === 'string') patch[field] = v
    else fieldErrors[field] = 'Must be a string'
  }
  if (Object.keys(fieldErrors).length) throw validationError(fieldErrors)

  const contact = findContact(state, id)
  const merged = { ...toForm(contact), ...patch }
  const errors = validateContactForm(merged)
  const relevant = Object.fromEntries(Object.entries(errors).filter(([k]) => k in patch)) as Record<string, string>
  if (Object.keys(relevant).length) throw validationError(relevant)

  if (opts.checkVersion && input.version !== contact.version) {
    throw new MockHttpError(409, 'VERSION_CONFLICT', 'This contact was changed by someone else.', {
      details: { current: clone(contact) },
    })
  }

  const changes: ActivityChange[] = []
  for (const field of EDITABLE) {
    if (!(field in patch)) continue
    const next = toStored(field, patch[field]!)
    const prev = contact[field] ?? null
    if (next !== prev) changes.push({ field, from: prev, to: next })
  }
  if (!changes.length) return clone(contact)

  const email = changes.find((c) => c.field === 'email')?.to
  if (email && state.contacts.some((c) => c.id !== id && c.email === email)) {
    throw new MockHttpError(409, 'EMAIL_TAKEN', 'Email already in use', {
      fields: { email: 'This email is already used by another contact' },
    })
  }

  for (const { field, to } of changes) {
    if (field === 'firstName') contact.firstName = to ?? ''
    else contact[field] = to
  }
  contact.version += 1
  contact.updatedAt = new Date().toISOString()
  addActivity(state, { contactId: id, type: 'CONTACT_UPDATED', changes, source: 'single' })
  return clone(contact)
}

function listContacts(state: MockState, params: URLSearchParams) {
  const { query, invalid } = parseListQuery(params)
  if (invalid.length) throw validationError(Object.fromEntries(invalid.map((k) => [k, 'Invalid value'])))

  const ql = query.q.toLowerCase()
  const qDigits = PHONE_QUERY_RE.test(query.q) ? digitsOnly(query.q) : ''
  const tagKeys = new Set(query.tags.map(tagKey))
  const company = query.company.toLowerCase()

  const matches = state.contacts.filter((c) => {
    if (ql) {
      const hit =
        fullNameKey(c).startsWith(ql) ||
        (c.lastName ?? '').toLowerCase().startsWith(ql) ||
        (c.email ?? '').startsWith(ql) ||
        (qDigits !== '' && digitsOnly(c.phone ?? '').startsWith(qDigits))
      if (!hit) return false
    }
    if (tagKeys.size && !c.tags.some((t) => tagKeys.has(tagKey(t)))) return false
    if (company && !(c.company ?? '').toLowerCase().startsWith(company)) return false
    return true
  })

  const dir = query.sort.startsWith('-') ? -1 : 1
  const byName = query.sort.endsWith('name')
  matches.sort((a, b) => {
    const primary = byName ? cmp(fullNameKey(a), fullNameKey(b)) : cmp(a.createdAt, b.createdAt)
    return (primary || cmp(a.id, b.id)) * dir
  })

  const start = (query.page - 1) * query.limit
  return {
    data: clone(matches.slice(start, start + query.limit)),
    page: query.page,
    limit: query.limit,
    total: matches.length,
    totalPages: Math.ceil(matches.length / query.limit),
  }
}

function addTag(state: MockState, id: string, body: unknown, source: 'single' | 'bulk'): Contact {
  const raw = (body as { tag?: unknown } | null)?.tag
  const error = typeof raw === 'string' ? validateTagName(raw) : 'Tag name is required'
  if (error) throw validationError({ tag: error })
  const contact = findContact(state, id)
  const key = tagKey(raw as string)
  if (contact.tags.some((t) => tagKey(t) === key)) return clone(contact)
  if (contact.tags.length >= LIMITS.tagsPerContact) {
    throw new MockHttpError(422, 'TAG_LIMIT', `A contact can have at most ${LIMITS.tagsPerContact} tags`)
  }
  const name = canonicalTag(state, raw as string)
  contact.tags.push(name)
  contact.updatedAt = new Date().toISOString()
  addActivity(state, { contactId: id, type: 'TAG_ADDED', tag: name, source })
  return clone(contact)
}

function removeTag(state: MockState, id: string, rawTag: string): Contact {
  const contact = findContact(state, id)
  const key = tagKey(rawTag)
  const existing = contact.tags.find((t) => tagKey(t) === key)
  if (!existing) return clone(contact)
  contact.tags = contact.tags.filter((t) => t !== existing)
  contact.updatedAt = new Date().toISOString()
  addActivity(state, { contactId: id, type: 'TAG_REMOVED', tag: existing, source: 'single' })
  return clone(contact)
}

function bulkTag(state: MockState, body: unknown): BulkTagResult {
  const input = (body ?? {}) as { contactIds?: unknown; tag?: unknown }
  const fields: Record<string, string> = {}
  const ids = Array.isArray(input.contactIds) ? input.contactIds : null
  if (!ids || ids.length < 1 || ids.length > LIMITS.bulkMaxContacts) {
    fields.contactIds = `Provide between 1 and ${LIMITS.bulkMaxContacts} contact ids`
  } else if (!ids.every((x) => typeof x === 'string' && ID_RE.test(x))) {
    fields.contactIds = 'Every contact id must be valid'
  }
  const tagError = typeof input.tag === 'string' ? validateTagName(input.tag) : 'Tag name is required'
  if (tagError) fields.tag = tagError
  if (Object.keys(fields).length) throw validationError(fields)

  const unique = [...new Set(ids as string[])]
  const name = canonicalTag(state, input.tag as string)
  const key = tagKey(name)
  const result: BulkTagResult = { tag: name, requested: unique.length, updated: 0, alreadyTagged: 0, notFound: [], skipped: [] }
  for (const id of unique) {
    const c = state.contacts.find((x) => x.id === id)
    if (!c) result.notFound.push(id)
    else if (c.tags.some((t) => tagKey(t) === key)) result.alreadyTagged++
    else if (c.tags.length >= LIMITS.tagsPerContact) result.skipped.push(id)
    else {
      c.tags.push(name)
      c.updatedAt = new Date().toISOString()
      addActivity(state, { contactId: id, type: 'TAG_ADDED', tag: name, source: 'bulk' })
      result.updated++
    }
  }
  return result
}

function listActivity(state: MockState, id: string, params: URLSearchParams) {
  findContact(state, id)
  const rawLimit = params.get('limit')
  const limit = rawLimit === null ? LIMITS.activityPageSize : Number(rawLimit)
  if (!Number.isInteger(limit) || limit < 1 || limit > LIMITS.activityPageMax) throw validationError({ limit: 'Invalid value' })
  const items = state.activities
    .filter((a) => a.contactId === id)
    .sort((a, b) => cmp(b.createdAt, a.createdAt) || cmp(b.id, a.id))
  const before = params.get('before')
  const start = before ? items.findIndex((a) => a.id === before) + 1 : 0
  const page = items.slice(start, start + limit)
  const hasMore = start + limit < items.length
  return { data: clone(page), nextCursor: hasMore ? page[page.length - 1].id : null }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw validationError({ body: 'Expected a JSON body' })
  }
}

export function createHandlers(db: MockDb, opts: { latencyMs?: number; controls?: MockControls } = {}) {
  const { latencyMs = 0, controls } = opts

  // Wraps every route: simulated latency / cold start / failure, then mapped errors.
  const route =
    (fn: (args: { request: Request; params: Record<string, string> }) => Promise<unknown> | unknown): HttpResponseResolver =>
    async ({ request, params }) => {
      const cold = controls?.takeColdStart() ?? 0
      if (cold) await delay(cold)
      if (latencyMs) await delay(latencyMs)
      const failure = controls?.takeFailure(new URL(request.url).pathname)
      if (failure) {
        return errorResponse(new MockHttpError(failure.status, failure.code, 'Something went wrong on the server. Please try again.'))
      }
      try {
        return HttpResponse.json((await fn({ request, params: params as Record<string, string> })) as JsonBodyType)
      } catch (e) {
        if (e instanceof MockHttpError) return errorResponse(e)
        throw e
      }
    }

  return [
    http.get('*/api/health', route(() => ({ status: 'ok' }))),
    http.get('*/api/tags', route(() => [...db.read().tags].sort((a, b) => cmp(a.toLowerCase(), b.toLowerCase())).map((name): Tag => ({ name })))),
    http.get('*/api/contacts', route(({ request }) => listContacts(db.read(), new URL(request.url).searchParams))),
    http.post('*/api/contacts/bulk/tags', route(async ({ request }) => {
      const body = await readJson(request)
      return db.transact((s) => bulkTag(s, body))
    })),
    http.get('*/api/contacts/:id', route(({ params }) => clone(findContact(db.read(), params.id)))),
    http.patch('*/api/contacts/:id', route(async ({ request, params }) => {
      const body = await readJson(request)
      return db.transact((s) => applyContactUpdate(s, params.id, body, { checkVersion: true }))
    })),
    http.post('*/api/contacts/:id/tags', route(async ({ request, params }) => {
      const body = await readJson(request)
      return db.transact((s) => addTag(s, params.id, body, 'single'))
    })),
    http.delete('*/api/contacts/:id/tags/:tag', route(({ params }) =>
      db.transact((s) => removeTag(s, params.id, decodeURIComponent(params.tag))),
    )),
    http.get('*/api/contacts/:id/activity', route(({ request, params }) =>
      listActivity(db.read(), params.id, new URL(request.url).searchParams),
    )),
  ]
}
