/** Escapes text for use inside a RegExp, so user input like "(" or ".*" is matched literally. */
export const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Anchored (index-friendly) prefix match. */
export const prefix = (s: string): RegExp => new RegExp(`^${escapeRegex(s)}`)
