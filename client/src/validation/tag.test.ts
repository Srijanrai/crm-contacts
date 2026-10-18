import { normalizeTagName, tagKey, validateTagName } from './tag'

describe('tag validation', () => {
  it('normalises surrounding and internal whitespace', () => {
    expect(normalizeTagName('  Hot   Lead ')).toBe('Hot Lead')
  })

  it('accepts letters, digits, spaces, hyphen and underscore', () => {
    expect(validateTagName('Hot Lead')).toBeNull()
    expect(validateTagName('Q4-2026_vip')).toBeNull()
  })

  it('rejects empty, too long and special-character names', () => {
    expect(validateTagName('   ')).toBe('Tag name is required')
    expect(validateTagName('a'.repeat(31))).toBe('Tag names can be at most 30 characters')
    expect(validateTagName('C++')).toBe('Use letters, numbers, spaces, - or _ only')
  })

  it('validates the normalised form (31 chars with extra spaces is fine once collapsed)', () => {
    expect(validateTagName(`  ${'a'.repeat(30)}  `)).toBeNull()
  })

  it('builds a case-insensitive key', () => {
    expect(tagKey('VIP')).toBe(tagKey('vip'))
    expect(tagKey(' Hot  Lead ')).toBe('hot lead')
  })
})
