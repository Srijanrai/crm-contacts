import { model, Schema, type InferSchemaType } from 'mongoose'

/** A tenant (GoHighLevel's sub-account). Every contact, tag and activity belongs to one. */
const accountSchema = new Schema(
  { name: { type: String, required: true, trim: true, maxlength: 120 } },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
)

export type AccountDoc = InferSchemaType<typeof accountSchema>
export const Account = model('Account', accountSchema)
