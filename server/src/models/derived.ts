import { digitsOnly } from '../validators/common.js'

export interface DerivedFields {
  searchName: string
  searchLastName: string
  phoneDigits: string
  companyLower: string
}

/**
 * Lowercase / digits-only copies that make search and name sort indexable. Set by the
 * repository on every write (never by clients) and never returned by the API.
 * searchName is the same key the frontend mock sorts by: "first last", trimmed, lowercase.
 */
export function derivedFields(v: {
  firstName: string
  lastName?: string | null
  phone?: string | null
  company?: string | null
}): DerivedFields {
  return {
    searchName: `${v.firstName} ${v.lastName ?? ''}`.trim().toLowerCase(),
    searchLastName: (v.lastName ?? '').toLowerCase(),
    phoneDigits: digitsOnly(v.phone ?? ''),
    companyLower: (v.company ?? '').toLowerCase(),
  }
}
