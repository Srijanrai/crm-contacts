import mongoose from 'mongoose'
import { connectDb } from '../config/db.js'
import { parseEnv } from '../config/env.js'
import { assertSafeTarget, parseSeedCount, seedDatabase } from './seed.js'

/** npm run seed [-- --yes] [--count=N]  — resets the database at MONGODB_URI to the demo data. */
async function main() {
  const env = parseEnv(process.env)
  const argv = process.argv.slice(2)
  assertSafeTarget(env.mongodbUri, argv)
  const count = parseSeedCount(argv)
  await connectDb(env.mongodbUri)
  const counts = await seedDatabase({ accountId: env.defaultAccountId, count })
  console.log(`Seeded account ${env.defaultAccountId}:`, counts)
  await mongoose.disconnect()
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e)
  await mongoose.disconnect()
  process.exit(1)
})
