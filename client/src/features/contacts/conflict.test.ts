import { makeContact } from '@/test/factories'
import { diffConflict } from './conflict'
import { toFormValues } from './formModel'

describe('diffConflict', () => {
  const original = makeContact({ email: 'old@example.com', phone: '111 111 1111', company: 'Acme' })
  const base = toFormValues(original)

  it('lists my conflicting fields and, separately, what only they changed', () => {
    const current = { ...original, email: 'theirs@example.com', phone: '222 222 2222', version: 2 }
    expect(diffConflict({ email: 'mine@example.com' }, base, current)).toEqual({
      mineRows: [{ field: 'email', mine: 'mine@example.com', latest: 'theirs@example.com' }],
      othersChanged: ['phone'],
    })
  })

  it('includes my edit even when they did not touch that field', () => {
    const current = { ...original, company: 'Other', version: 2 }
    expect(diffConflict({ email: 'mine@example.com' }, base, current)).toEqual({
      mineRows: [{ field: 'email', mine: 'mine@example.com', latest: 'old@example.com' }],
      othersChanged: ['company'],
    })
  })

  it('drops a field where we both ended up with the same value', () => {
    const current = { ...original, email: 'same@example.com', version: 2 }
    expect(diffConflict({ email: 'same@example.com' }, base, current).mineRows).toEqual([])
  })
})
