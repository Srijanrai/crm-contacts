import { Router } from 'express'

/** Liveness only: answers without touching the database, so a cold start is detected quickly. */
export const healthRouter = Router().get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})
