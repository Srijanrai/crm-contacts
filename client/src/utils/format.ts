import type { Contact } from '@/types/api'

const numberFmt = new Intl.NumberFormat('en-US')
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
const relativeFmt = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export const formatNumber = (n: number) => numberFmt.format(n)
export const formatDate = (iso: string) => dateFmt.format(new Date(iso))
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso))

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

export function formatRelative(iso: string, now: Date = new Date()): string {
  const seconds = (new Date(iso).getTime() - now.getTime()) / 1000
  if (Math.abs(seconds) < 45) return 'just now'
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relativeFmt.format(Math.round(seconds / size), unit)
  }
  return relativeFmt.format(Math.round(seconds / 60), 'minute')
}

/** "Showing 21–40 of 5,000" */
export function formatRange(page: number, limit: number, total: number): string {
  if (total === 0) return 'No results'
  const from = (page - 1) * limit + 1
  const to = Math.min(total, page * limit)
  return `Showing ${formatNumber(from)}–${formatNumber(to)} of ${formatNumber(total)}`
}

export const fullName = (c: Pick<Contact, 'firstName' | 'lastName'>) => [c.firstName, c.lastName].filter(Boolean).join(' ')

export const initials = (c: Pick<Contact, 'firstName' | 'lastName'>) =>
  [c.firstName, c.lastName]
    .filter(Boolean)
    .map((part) => part!.trim().charAt(0).toUpperCase())
    .join('')
