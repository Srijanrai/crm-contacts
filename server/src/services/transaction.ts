import mongoose, { type ClientSession } from 'mongoose'

/**
 * Runs fn in one MongoDB transaction. Transient errors (e.g. a write conflict with a concurrent
 * save) retry the whole function, which then sees the committed state, so a racing stale save
 * ends as a clean 409 instead of an error.
 */
export const withTransaction = <T>(fn: (session: ClientSession) => Promise<T>): Promise<T> =>
  mongoose.connection.transaction(fn)
