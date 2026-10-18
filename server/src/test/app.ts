import request from 'supertest'
import { createApp } from '../app.js'
import type { Env } from '../config/env.js'
import { createAccount } from './factories.js'

export const testEnv = (defaultAccountId: string): Env => ({
  port: 0,
  mongodbUri: 'unused-in-tests',
  corsOrigins: ['http://localhost:5173'],
  defaultAccountId,
})

/** A fresh account plus a Supertest agent whose requests are scoped to it. */
export async function setupApi() {
  const accountId = await createAccount()
  const app = createApp(testEnv(accountId))
  return { accountId, app, api: request(app) }
}
