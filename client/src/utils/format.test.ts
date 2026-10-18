import { formatDate, formatRange, formatRelative, fullName, initials } from './format'
import { makeContact } from '@/test/factories'

describe('format', () => {
  it('formats the visible range', () => {
    expect(formatRange(2, 20, 5000)).toBe('Showing 21–40 of 5,000')
    expect(formatRange(3, 20, 45)).toBe('Showing 41–45 of 45')
    expect(formatRange(1, 20, 0)).toBe('No results')
  })

  it('formats dates in a short, unambiguous form', () => {
    expect(formatDate('2026-03-05T10:00:00.000Z')).toBe('5 Mar 2026')
  })

  it('formats relative times', () => {
    const now = new Date('2026-10-17T12:00:00.000Z')
    expect(formatRelative('2026-10-17T11:59:40.000Z', now)).toBe('just now')
    expect(formatRelative('2026-10-17T11:55:00.000Z', now)).toBe('5 minutes ago')
    expect(formatRelative('2026-10-14T12:00:00.000Z', now)).toBe('3 days ago')
    expect(formatRelative('2025-10-17T12:00:00.000Z', now)).toBe('last year')
  })

  it('builds names and initials, tolerating a missing last name', () => {
    expect(fullName(makeContact({ firstName: 'Ada', lastName: 'Lovelace' }))).toBe('Ada Lovelace')
    expect(fullName(makeContact({ firstName: 'Cher', lastName: null }))).toBe('Cher')
    expect(initials(makeContact({ firstName: 'ada', lastName: 'lovelace' }))).toBe('AL')
    expect(initials(makeContact({ firstName: 'Cher', lastName: null }))).toBe('C')
  })
})
