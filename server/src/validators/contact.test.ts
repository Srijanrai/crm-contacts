import { validateContactPatch, validateMergedContact } from './contact.js'

const errorsOf = (body: unknown) => {
  const r = validateContactPatch(body)
  if (r.ok) throw new Error('expected errors')
  return r.errors
}

describe('validateContactPatch', () => {
  it('trims values and lowercases email', () => {
    expect(validateContactPatch({ version: 2, email: ' A@B.co ' })).toEqual({ ok: true, value: { version: 2, patch: { email: 'a@b.co' } } })
  })

  it('requires an integer version', () => {
    expect(errorsOf({ version: '2' })).toHaveProperty('version', 'Version is required')
    expect(errorsOf({ email: 'a@b.co' })).toHaveProperty('version')
    expect(errorsOf({ version: 0 })).toHaveProperty('version')
  })

  it('rejects non-string values, including query operators', () => {
    expect(errorsOf({ version: 1, email: { $ne: null } })).toEqual({ email: 'Must be a string' })
    expect(errorsOf({ version: 1, firstName: 42 })).toEqual({ firstName: 'Must be a string' })
  })

  it('rejects unknown keys, including __proto__', () => {
    expect(errorsOf({ version: 1, role: 'admin' })).toEqual({ role: 'Unknown field' })
    expect(errorsOf(JSON.parse('{"__proto__": {"x": 1}, "version": 1}'))).toEqual(Object.fromEntries([['__proto__', 'Unknown field']]))
  })

  it('rejects bodies that are not objects', () => {
    expect(errorsOf([])).toEqual({ body: 'Expected a JSON object' })
    expect(errorsOf(null)).toEqual({ body: 'Expected a JSON object' })
    expect(errorsOf('x')).toEqual({ body: 'Expected a JSON object' })
  })

  it('applies field rules with the same messages as the frontend', () => {
    expect(errorsOf({ version: 1, firstName: ' ' })).toEqual({ firstName: 'First name is required' })
    expect(errorsOf({ version: 1, phone: '12345' })).toEqual({ phone: 'Enter a valid phone number' })
    expect(errorsOf({ version: 1, email: 'a@b' })).toEqual({ email: 'Enter a valid email' })
    expect(errorsOf({ version: 1, company: 'c'.repeat(121) })).toEqual({ company: 'Must be at most 120 characters' })
  })

  it('treats null as clearing a field', () => {
    expect(validateContactPatch({ version: 1, company: null })).toEqual({ ok: true, value: { version: 1, patch: { company: '' } } })
  })
})

describe('validateMergedContact', () => {
  it('validates a full record', () => {
    expect(validateMergedContact({ firstName: '', lastName: '', email: 'x', phone: '', company: '' })).toEqual({
      firstName: 'First name is required',
      email: 'Enter a valid email',
    })
  })
})
