import { model, Schema, Types } from 'mongoose'

/** The tag catalogue: options for the tag filter and autocomplete, without scanning contacts. */
const tagSchema = new Schema(
  {
    accountId: { type: Schema.Types.ObjectId, required: true },
    /** Display form, in the casing first used (e.g. "VIP"). Contacts store this exact string. */
    name: { type: String, required: true, maxlength: 30 },
    /** Lowercase identity: "vip" and "VIP" are one tag. */
    key: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
)

tagSchema.index({ accountId: 1, key: 1 }, { unique: true })

export interface TagDoc {
  _id: Types.ObjectId
  accountId: Types.ObjectId
  name: string
  key: string
  createdAt: Date
}

export const Tag = model('Tag', tagSchema)
