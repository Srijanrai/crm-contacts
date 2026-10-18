import { model, Schema, Types } from 'mongoose'

const contactSchema = new Schema(
  {
    accountId: { type: Schema.Types.ObjectId, required: true },
    firstName: { type: String, required: true, trim: true, maxlength: 100 },
    // Optional fields are absent (not "") when empty, so the partial unique email index works.
    lastName: { type: String, trim: true, maxlength: 100 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 32 },
    company: { type: String, trim: true, maxlength: 120 },
    tags: { type: [String], default: [] },
    /** Optimistic-concurrency counter: +1 on every field edit (not on tag changes). */
    version: { type: Number, default: 1, min: 1 },
    // Derived (see derived.ts): indexed lowercase / digit copies for search and sort.
    searchName: { type: String, required: true },
    searchLastName: { type: String, default: '' },
    phoneDigits: { type: String, default: '' },
    companyLower: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false },
)

// Every index starts with accountId: one account's queries never scan another's data.
contactSchema.index({ accountId: 1, email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } })
contactSchema.index({ accountId: 1, searchName: 1, _id: 1 })
contactSchema.index({ accountId: 1, searchLastName: 1 })
contactSchema.index({ accountId: 1, phoneDigits: 1 })
contactSchema.index({ accountId: 1, createdAt: -1, _id: -1 })
contactSchema.index({ accountId: 1, tags: 1 })
contactSchema.index({ accountId: 1, companyLower: 1 })

export interface ContactDoc {
  _id: Types.ObjectId
  accountId: Types.ObjectId
  firstName: string
  lastName?: string | null
  email?: string | null
  phone?: string | null
  company?: string | null
  tags: string[]
  version: number
  searchName: string
  searchLastName: string
  phoneDigits: string
  companyLower: string
  createdAt: Date
  updatedAt: Date
}

export const Contact = model('Contact', contactSchema)
