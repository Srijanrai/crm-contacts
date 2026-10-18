import mongoose from 'mongoose'
import { Account } from '../models/Account.js'
import { Activity } from '../models/Activity.js'
import { Contact } from '../models/Contact.js'
import { Tag } from '../models/Tag.js'

export async function connectDb(uri: string): Promise<void> {
  // Fail on queries made before connecting instead of buffering them.
  mongoose.set('bufferCommands', false)
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 })
}

/** Creates any missing indexes (idempotent). Run on startup and after the seed resets collections. */
export async function ensureIndexes(): Promise<void> {
  await Promise.all([Account, Contact, Tag, Activity].map((m) => m.createIndexes()))
}
