import type { Contact, ErrorCode } from '../types/api.js'

interface Extra {
  fields?: Record<string, string>
  details?: { current?: Contact }
}

/** The one error type services throw; the error middleware turns it into the API error body. */
export class AppError extends Error {
  status: number
  code: ErrorCode
  fields?: Record<string, string>
  details?: { current?: Contact }

  constructor(status: number, code: ErrorCode, message: string, extra: Extra = {}) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.fields = extra.fields
    this.details = extra.details
  }

  static validation(fields: Record<string, string>, message = 'Invalid request') {
    return new AppError(400, 'VALIDATION_ERROR', message, { fields })
  }
  static invalidId(what = 'contact') {
    return new AppError(400, 'INVALID_ID', `Invalid ${what} id`)
  }
  static notFound(what = 'Contact') {
    return new AppError(404, 'NOT_FOUND', `${what} not found`)
  }
  static versionConflict(current: Contact) {
    return new AppError(409, 'VERSION_CONFLICT', 'This contact was changed by someone else.', { details: { current } })
  }
  static emailTaken() {
    return new AppError(409, 'EMAIL_TAKEN', 'Email already in use', {
      fields: { email: 'This email is already used by another contact' },
    })
  }
  static tagLimit() {
    return new AppError(422, 'TAG_LIMIT', 'A contact can have at most 20 tags')
  }
  static internal() {
    return new AppError(500, 'INTERNAL', 'Something went wrong on the server. Please try again.')
  }
}
