import { Link } from 'react-router'
import { toneIndex } from '@/components/ui'
import type { Contact } from '@/types/api'
import { cn } from '@/utils/cn'
import { fullName, initials } from '@/utils/format'

const AVATAR_TONES = [
  'bg-sky-100 text-sky-800',
  'bg-violet-100 text-violet-800',
  'bg-amber-100 text-amber-900',
  'bg-emerald-100 text-emerald-800',
  'bg-rose-100 text-rose-800',
  'bg-indigo-100 text-indigo-800',
  'bg-lime-100 text-lime-900',
  'bg-orange-100 text-orange-900',
] as const

export function Avatar({ contact, size = 'sm' }: { contact: Pick<Contact, 'firstName' | 'lastName'>; size?: 'sm' | 'lg' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        AVATAR_TONES[toneIndex(fullName(contact), AVATAR_TONES.length)],
        size === 'sm' ? 'size-8 text-xs' : 'size-12 text-base',
      )}
    >
      {initials(contact)}
    </span>
  )
}

/** Avatar + name; the name is a stretched link so the whole row/card is clickable. */
export function ContactName({ contact, to }: { contact: Contact; to: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar contact={contact} />
      <Link
        to={to}
        className="truncate font-medium text-slate-900 after:absolute after:inset-0 hover:text-brand-800 focus-visible:outline-none focus-visible:after:rounded focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-brand-600"
      >
        {fullName(contact)}
      </Link>
    </div>
  )
}
