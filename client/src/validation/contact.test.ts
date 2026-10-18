import { validateContactForm } from './contact'
import type { ContactFormValues } from '@/types/api'

const valid: ContactFormValues = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '+44 (20) 7946-0958',
  company: 'Analytical Engines',
}

describe('validateContactForm', () => {
  it('accepts a fully valid contact', () => {
    expect(validateContactForm(valid)).toEqual({})
  })

  it('accepts empty optional fields', () => {
    expect(validateContactForm({ firstName: 'Ada', lastName: '', email: '', phone: '', company: '' })).toEqual({})
  })

  it('requires a first name (whitespace does not count)', () => {
    expect(validateContactForm({ ...valid, firstName: '   ' }).firstName).toBe('First name is required')
  })

  it('limits first name to 100 characters', () => {
    expect(validateContactForm({ ...valid, firstName: 'a'.repeat(101) }).firstName).toBe('Must be at most 100 characters')
    expect(validateContactForm({ ...valid, firstName: 'a'.repeat(100) }).firstName).toBeUndefined()
  })

  it('limits last name to 100 and company to 120 characters', () => {
    const errors = validateContactForm({ ...valid, lastName: 'b'.repeat(101), company: 'c'.repeat(121) })
    expect(errors.lastName).toBe('Must be at most 100 characters')
    expect(errors.company).toBe('Must be at most 120 characters')
  })

  it('rejects malformed email and accepts mixed case', () => {
    expect(validateContactForm({ ...valid, email: 'a@b' }).email).toBe('Enter a valid email')
    expect(validateContactForm({ ...valid, email: 'not an email' }).email).toBe('Enter a valid email')
    expect(validateContactForm({ ...valid, email: 'A@B.co' }).email).toBeUndefined()
  })

  it('limits email to 254 characters', () => {
    const long = `${'a'.repeat(250)}@b.co`
    expect(validateContactForm({ ...valid, email: long }).email).toBe('Must be at most 254 characters')
  })

  it('validates phone characters and digit count', () => {
    expect(validateContactForm({ ...valid, phone: '12345' }).phone).toBe('Enter a valid phone number')
    expect(validateContactForm({ ...valid, phone: 'abc1234567' }).phone).toBe('Enter a valid phone number')
    expect(validateContactForm({ ...valid, phone: '1'.repeat(16) }).phone).toBe('Enter a valid phone number')
    expect(validateContactForm({ ...valid, phone: '555.123.4567' }).phone).toBeUndefined()
  })
})
