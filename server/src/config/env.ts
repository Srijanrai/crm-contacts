/** The single demo account every request uses when no X-Account-Id header is sent (no auth in this demo). */
export const DEMO_ACCOUNT_ID = '6650a0000000000000000001'

export interface Env {
  port: number
  mongodbUri: string
  corsOrigins: string[]
  defaultAccountId: string
}

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i

/** Reads and validates configuration; fails fast so a misconfigured deploy never starts half-working. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const mongodbUri = source.MONGODB_URI?.trim()
  if (!mongodbUri) throw new Error('MONGODB_URI is required')

  const rawPort = source.PORT?.trim() || '4000'
  if (!/^\d+$/.test(rawPort) || Number(rawPort) < 1) throw new Error('PORT must be a positive integer')

  const defaultAccountId = source.DEFAULT_ACCOUNT_ID?.trim() || DEMO_ACCOUNT_ID
  if (!OBJECT_ID_RE.test(defaultAccountId)) throw new Error('DEFAULT_ACCOUNT_ID must be a 24-character hex id')

  const corsOrigins = (source.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, '')) // browsers send Origin without a trailing slash
    .filter(Boolean)

  return { port: Number(rawPort), mongodbUri, corsOrigins, defaultAccountId }
}
