// API contract — kept identical to client/src/types/api.ts. A shared package (or zod) would remove this copy.

export type SortKey = 'name' | '-name' | 'createdAt' | '-createdAt'

export interface Contact {
  id: string
  firstName: string
  lastName: string | null
  email: string | null
  phone: string | null
  company: string | null
  tags: string[]
  version: number
  createdAt: string
  updatedAt: string
}

export interface ListQuery {
  q: string
  tags: string[]
  company: string
  sort: SortKey
  page: number
  limit: number
}

export interface ContactListResponse {
  data: Contact[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export type EditableField = 'firstName' | 'lastName' | 'email' | 'phone' | 'company'
/** Form representation: "" means empty. */
export type ContactFormValues = Record<EditableField, string>
export type UpdateContactInput = { version: number } & Partial<ContactFormValues>

export interface BulkTagInput {
  contactIds: string[]
  tag: string
}

export interface BulkTagResult {
  tag: string
  requested: number
  updated: number
  alreadyTagged: number
  notFound: string[]
  skipped: string[]
}

export type ActivityType = 'CONTACT_UPDATED' | 'TAG_ADDED' | 'TAG_REMOVED'

export interface ActivityChange {
  field: EditableField
  from: string | null
  to: string | null
}

export interface Activity {
  id: string
  contactId: string
  type: ActivityType
  createdAt: string
  changes?: ActivityChange[]
  tag?: string
  source: 'single' | 'bulk'
}

export interface ActivityPage {
  data: Activity[]
  nextCursor: string | null
}

export interface Tag {
  name: string
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_ID'
  | 'NOT_FOUND'
  | 'VERSION_CONFLICT'
  | 'EMAIL_TAKEN'
  | 'TAG_LIMIT'
  | 'INTERNAL'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'UNKNOWN'

export interface ApiErrorBody {
  error: {
    code: ErrorCode
    message: string
    fields?: Record<string, string>
    details?: { current?: Contact }
  }
}

export type FieldErrors = Partial<Record<string, string>>
