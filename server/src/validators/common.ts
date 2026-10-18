export const isObjectId = (s: unknown): s is string => typeof s === 'string' && /^[a-f0-9]{24}$/i.test(s)

export const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

export const digitsOnly = (s: string): string => s.replace(/\D/g, '')

/** A search string that looks like a phone number (and may therefore match phone digits). */
export const PHONE_QUERY_RE = /^[+0-9 ().-]+$/

/** Positive safe integer from a query-string value; null when invalid. */
export function parsePositiveInt(raw: unknown): number | null {
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return null
  const n = Number(raw)
  return Number.isSafeInteger(n) && n >= 1 ? n : null
}
