import mongoose from 'mongoose'
import { createApp } from './app.js'
import { connectDb, ensureIndexes } from './config/db.js'
import { parseEnv } from './config/env.js'

async function main() {
  const env = parseEnv(process.env)
  await connectDb(env.mongodbUri)
  await ensureIndexes()
  const server = createApp(env).listen(env.port, () => console.log(`API listening on :${env.port}`))

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`)
    server.close(() => {
      void mongoose.disconnect().then(() => process.exit(0))
    })
    // Don't hang forever on open keep-alive connections.
    setTimeout(() => process.exit(1), 10_000).unref()
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((e) => {
  console.error('Failed to start:', e instanceof Error ? e.message : e)
  process.exit(1)
})
