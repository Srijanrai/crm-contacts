import { MongoMemoryReplSet } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { ensureIndexes } from '../config/db.js'

let replSet: MongoMemoryReplSet | null = null

/** An in-memory single-node replica set, so transactions behave as on Atlas. */
export async function startTestDb(): Promise<void> {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } })
  await mongoose.connect(replSet.getUri(), { dbName: 'test' })
  await ensureIndexes()
}

export async function clearTestDb(): Promise<void> {
  const collections = await mongoose.connection.db!.collections()
  await Promise.all(collections.map((c) => c.deleteMany({})))
}

export async function stopTestDb(): Promise<void> {
  await mongoose.disconnect()
  await replSet?.stop()
  replSet = null
}
