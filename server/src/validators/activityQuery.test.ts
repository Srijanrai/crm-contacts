import { validateActivityQuery } from './activityQuery.js'

describe('validateActivityQuery', () => {
  it('defaults the limit', () => {
    expect(validateActivityQuery({})).toEqual({ ok: true, value: { limit: 20 } })
  })

  it('accepts a limit and cursor', () => {
    expect(validateActivityQuery({ limit: '5', before: 'a'.repeat(24) })).toEqual({ ok: true, value: { limit: 5, before: 'a'.repeat(24) } })
  })

  it('rejects bad limits and cursors', () => {
    expect(validateActivityQuery({ limit: '51' })).toEqual({ ok: false, errors: { limit: 'Invalid value' } })
    expect(validateActivityQuery({ before: 'x' })).toEqual({ ok: false, errors: { before: 'Invalid cursor' } })
  })
})
