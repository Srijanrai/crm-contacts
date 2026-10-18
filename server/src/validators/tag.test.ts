import { normalizeTagName, tagKey, validateBulkTagBody, validateTagBody, validateTagName } from './tag.js'

const id = (n: number) => n.toString(16).padStart(24, '0')

describe('tag validators', () => {
  it('normalises and keys tag names', () => {
    expect(normalizeTagName('  hot   lead ')).toBe('hot lead')
    expect(tagKey(' Hot  Lead ')).toBe('hot lead')
  })

  it('validates names with the frontend messages', () => {
    expect(validateTagName('C++')).toBe('Use letters, numbers, spaces, - or _ only')
    expect(validateTagName('a'.repeat(31))).toBe('Tag names can be at most 30 characters')
    expect(validateTagName(' ')).toBe('Tag name is required')
    expect(validateTagName(5)).toBe('Tag name is required')
    expect(validateTagName('Q4-2026_vip')).toBeNull()
  })

  it('validates the add-tag body', () => {
    expect(validateTagBody({ tag: ' VIP ' })).toEqual({ ok: true, value: { tag: 'VIP' } })
    expect(validateTagBody({ tag: { $gt: '' } })).toEqual({ ok: false, errors: { tag: 'Tag name is required' } })
  })

  it('validates and de-duplicates bulk ids', () => {
    expect(validateBulkTagBody({ contactIds: [id(1), id(1), id(2)], tag: 'VIP' })).toEqual({
      ok: true,
      value: { contactIds: [id(1), id(2)], tag: 'VIP' },
    })
    expect(validateBulkTagBody({ contactIds: [], tag: 'VIP' })).toEqual({
      ok: false,
      errors: { contactIds: 'Provide between 1 and 500 contact ids' },
    })
    expect(validateBulkTagBody({ contactIds: Array.from({ length: 501 }, (_, i) => id(i)), tag: 'VIP' }).ok).toBe(false)
    expect(validateBulkTagBody({ contactIds: ['nope'], tag: 'VIP' })).toEqual({
      ok: false,
      errors: { contactIds: 'Every contact id must be valid' },
    })
  })
})
