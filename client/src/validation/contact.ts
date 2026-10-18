import type { ContactFormValues, FieldErrors } from '@/types/api'
import { LIMITS } from './limits'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_CHARS_RE = /^[+0-9 ().-]+$/

export const digitsOnly = (s: string): string => s.replace(/\D/g, '')

const tooLong = (max: number) => `Must be at most ${max} characters`

export function validateEmail(raw: string): string | undefined {
  const email = raw.trim()
  if (!email) return undefined
  if (email.length > LIMITS.emailMax) return tooLong(LIMITS.emailMax)
  if (!EMAIL_RE.test(email)) return 'Enter a valid email'
  return undefined
}

export function validatePhone(raw: string): string | undefined {
  const phone = raw.trim()
  if (!phone) return undefined
  const digits = digitsOnly(phone).length
  if (!PHONE_CHARS_RE.test(phone) || digits < LIMITS.phoneMinDigits || digits > LIMITS.phoneMaxDigits) {
    return 'Enter a valid phone number'
  }
  return undefined
}

/** Pure form validation mirroring the server rules. Returns {} when valid. */
export function validateContactForm(values: ContactFormValues): FieldErrors {
  const errors: FieldErrors = {}
  const firstName = values.firstName.trim()
  if (!firstName) errors.firstName = 'First name is required'
  else if (firstName.length > LIMITS.firstNameMax) errors.firstName = tooLong(LIMITS.firstNameMax)

  if (values.lastName.trim().length > LIMITS.lastNameMax) errors.lastName = tooLong(LIMITS.lastNameMax)
  if (values.company.trim().length > LIMITS.companyMax) errors.company = tooLong(LIMITS.companyMax)

  const email = validateEmail(values.email)
  if (email) errors.email = email
  const phone = validatePhone(values.phone)
  if (phone) errors.phone = phone
  return errors
}
