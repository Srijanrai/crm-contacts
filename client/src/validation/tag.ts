import { LIMITS } from './limits'

const TAG_RE = /^[A-Za-z0-9 _-]+$/

export const normalizeTagName = (raw: string): string => raw.trim().replace(/\s+/g, ' ')

/** Case-insensitive identity of a tag: "VIP" and "vip" are the same tag. */
export const tagKey = (name: string): string => normalizeTagName(name).toLowerCase()

/** Returns an error message, or null when the (normalised) name is valid. */
export function validateTagName(raw: string): string | null {
  const name = normalizeTagName(raw)
  if (!name) return 'Tag name is required'
  if (name.length > LIMITS.tagNameMax) return `Tag names can be at most ${LIMITS.tagNameMax} characters`
  if (!TAG_RE.test(name)) return 'Use letters, numbers, spaces, - or _ only'
  return null
}
