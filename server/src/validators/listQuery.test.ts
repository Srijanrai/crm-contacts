import { validateListQuery } from './listQuery.js'

const defaults = { q: '', tags: [], company: '', sort: '-createdAt', page: 1, limit: 20 }

describe('validateListQuery', () => {
  it('applies defaults', () => {
    expect(validateListQuery({})).toEqual({ ok: true, value: defaults })
  })

  it('parses valid values', () => {
    expect(validateListQuery({ q: ' jo ', tags: 'VIP, Lead,', company: 'acme', sort: 'name', page: '3', limit: '50' })).toEqual({
      ok: true,
      value: { q: 'jo', tags: ['VIP', 'Lead'], company: 'acme', sort: 'name', page: 3, limit: 50 },
    })
  })

  it('reports invalid values instead of clamping', () => {
    expect(validateListQuery({ page: 'abc', limit: '101', sort: 'foo' })).toEqual({
      ok: false,
      errors: { page: 'Invalid value', limit: 'Invalid value', sort: 'Invalid value' },
    })
  })

  it('rejects repeated params, unsafe integers, too many tags and long searches', () => {
    expect(validateListQuery({ page: ['1', '2'] }).ok).toBe(false)
    expect(validateListQuery({ page: '99999999999999999999' }).ok).toBe(false)
    expect(validateListQuery({ tags: Array.from({ length: 11 }, (_, i) => `t${i}`).join(',') }).ok).toBe(false)
    expect(validateListQuery({ q: 'a'.repeat(101) }).ok).toBe(false)
  })
})
