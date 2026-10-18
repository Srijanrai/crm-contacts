import { Checkbox } from '@/components/ui'
import type { Contact } from '@/types/api'
import { cn } from '@/utils/cn'
import { formatDate, fullName } from '@/utils/format'
import { ContactName } from './ContactName'
import type { RowSelection } from './selection'
import { TagList } from './TagList'

interface ContactCardListProps {
  contacts: Contact[]
  hrefFor: (c: Contact) => string
  selection?: RowSelection
}

/** The list below the md breakpoint: same data as the table, stacked. */
export function ContactCardList({ contacts, hrefFor, selection }: ContactCardListProps) {
  return (
    <>
      {selection && (
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-2.5">
          <Checkbox
            label="Select all contacts on this page"
            checked={selection.page === 'all'}
            indeterminate={selection.page === 'some'}
            onChange={selection.togglePage}
          />
        </div>
      )}
      <ul className="divide-y divide-slate-100">
      {contacts.map((c) => {
        const selected = selection?.isSelected(c.id) ?? false
        return (
          <li key={c.id} className={cn('relative flex gap-3 px-4 py-3.5', selected && 'bg-brand-50/60')}>
            {selection && (
              <div className="relative z-10 pt-2">
                <Checkbox label={`Select ${fullName(c)}`} hideLabel checked={selected} onChange={() => selection.toggle(c.id)} />
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-1.5">
              <ContactName contact={c} to={hrefFor(c)} />
              <div className="space-y-0.5 pl-11 text-sm text-slate-600">
                {c.email && <p className="truncate">{c.email}</p>}
                {c.phone && <p className="truncate tabular-nums">{c.phone}</p>}
                {c.company && <p className="truncate">{c.company}</p>}
                <p className="text-xs text-slate-500">
                  <time dateTime={c.createdAt}>Added {formatDate(c.createdAt)}</time>
                </p>
              </div>
              {c.tags.length > 0 && (
                <div className="pl-11">
                  <TagList tags={c.tags} max={3} />
                </div>
              )}
            </div>
          </li>
        )
      })}
      </ul>
    </>
  )
}
