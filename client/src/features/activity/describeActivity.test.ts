import type { Activity } from '@/types/api'
import { describeActivity } from './describeActivity'

const base = { id: '1', contactId: 'c', createdAt: '2026-10-17T10:00:00.000Z', source: 'single' as const }

describe('describeActivity', () => {
  it('describes tag changes, marking bulk ones', () => {
    expect(describeActivity({ ...base, type: 'TAG_ADDED', tag: 'VIP' })).toEqual({ title: 'Tag "VIP" added' })
    expect(describeActivity({ ...base, type: 'TAG_ADDED', tag: 'VIP', source: 'bulk' })).toEqual({ title: 'Tag "VIP" added (bulk)' })
    expect(describeActivity({ ...base, type: 'TAG_REMOVED', tag: 'Lead' })).toEqual({ title: 'Tag "Lead" removed' })
  })

  it('describes a single field change with before and after', () => {
    const a: Activity = { ...base, type: 'CONTACT_UPDATED', changes: [{ field: 'email', from: 'a@x.com', to: 'b@x.com' }] }
    expect(describeActivity(a)).toEqual({ title: 'Email changed', detail: 'a@x.com → b@x.com' })
    const cleared: Activity = { ...base, type: 'CONTACT_UPDATED', changes: [{ field: 'phone', from: '123', to: null }] }
    expect(describeActivity(cleared)).toEqual({ title: 'Phone changed', detail: '123 → empty' })
  })

  it('summarises several field changes', () => {
    const a: Activity = {
      ...base,
      type: 'CONTACT_UPDATED',
      changes: [
        { field: 'email', from: null, to: 'b@x.com' },
        { field: 'phone', from: '1', to: '2' },
        { field: 'company', from: 'A', to: 'B' },
      ],
    }
    expect(describeActivity(a)).toEqual({ title: '3 fields updated', detail: 'Email, Phone, Company' })
  })
})
