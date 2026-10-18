import type { Contact } from '@/types/api'

let n = 0
export function makeContact(overrides: Partial<Contact> = {}): Contact {
  n++
  const id = overrides.id ?? n.toString(16).padStart(24, 'c')
  return {
    id,
    firstName: `First${n}`,
    lastName: `Last${n}`,
    email: `person${n}@example.com`,
    phone: '+1 555 010 0000',
    company: 'Acme',
    tags: [],
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}
