import { model, Schema, Types } from 'mongoose'
import type { ActivityType, EditableField } from '../types/api.js'

const changeSchema = new Schema(
  {
    field: { type: String, required: true, enum: ['firstName', 'lastName', 'email', 'phone', 'company'] },
    from: { type: String, default: null },
    to: { type: String, default: null },
  },
  { _id: false },
)

/** Append-only history, written in the same transaction as the change it records. */
const activitySchema = new Schema(
  {
    accountId: { type: Schema.Types.ObjectId, required: true },
    contactId: { type: Schema.Types.ObjectId, required: true },
    type: { type: String, required: true, enum: ['CONTACT_UPDATED', 'TAG_ADDED', 'TAG_REMOVED'] },
    changes: { type: [changeSchema], default: undefined },
    tag: { type: String },
    source: { type: String, required: true, enum: ['single', 'bulk'], default: 'single' },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
)

activitySchema.index({ accountId: 1, contactId: 1, createdAt: -1, _id: -1 })

export interface ActivityDoc {
  _id: Types.ObjectId
  accountId: Types.ObjectId
  contactId: Types.ObjectId
  type: ActivityType
  changes?: { field: EditableField; from: string | null; to: string | null }[]
  tag?: string
  source: 'single' | 'bulk'
  createdAt: Date
}

export const Activity = model('Activity', activitySchema)
