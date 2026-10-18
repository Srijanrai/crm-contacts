import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import type { Env } from './config/env.js'
import { account } from './middleware/account.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/requestLogger.js'
import { healthRouter } from './routes/health.js'
import { apiRouter } from './routes/index.js'

/** Builds the app without listening, so tests can drive it with Supertest. */
export function createApp(env: Env): express.Express {
  const app = express()
  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({ origin: env.corsOrigins, allowedHeaders: ['Content-Type', 'X-Account-Id'] }))
  app.use(requestLogger) // before the body parser, so malformed and oversized bodies are logged too
  app.use(express.json({ limit: '100kb' }))
  app.use('/api', healthRouter)
  app.use('/api', account(env), apiRouter())
  app.use(notFound)
  app.use(errorHandler)
  return app
}
