import { Checkbox } from '@/components/ui'
import type { Contact } from '@/types/api'
import { cn } from '@/utils/cn'
import { formatDate, formatDateTime, fullName } from '@/utils/format'
import { ContactName } from './ContactName'
import type { RowSelection } from './selection'
import { TagList } from './TagList'

interface ContactsTableProps {
  contacts: Contact[]
  hrefFor: (c: Contact) => string
  selection?: RowSelection
}

const th = 'px-4 py-2.5 text-left text-xs font-medium text-slate-500'
const td = 'px-4 py-3 align-middle'

export function ContactsTable({ contacts, hrefFor, selection }: ContactsTableProps) {
  return (
    <table className="w-full table-fixed text-sm">
      <thead className="border-b border-slate-200 bg-slate-50/80">
        <tr>
          {selection && (
            <th scope="col" className="w-12 py-2.5 pl-4">
              <Checkbox
                label="Select all contacts on this page"
                hideLabel
                checked={selection.page === 'all'}
                indeterminate={selection.page === 'some'}
                onChange={selection.togglePage}
              />
            </th>
          )}
          <th scope="col" className={cn(th, 'w-[26%]')}>Name</th>
          <th scope="col" className={cn(th, 'w-[26%]')}>Email</th>
          <th scope="col" className={cn(th, 'hidden w-[16%] lg:table-cell')}>Company</th>
          <th scope="col" className={cn(th, 'hidden w-[15%] xl:table-cell')}>Phone</th>
          <th scope="col" className={cn(th, 'w-[22%]')}>Tags</th>
          <th scope="col" className={cn(th, 'w-32')}>Created</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {contacts.map((c) => {
          const selected = selection?.isSelected(c.id) ?? false
          return (
            <tr key={c.id} className={cn('relative transition-colors hover:bg-slate-50', selected && 'bg-brand-50/60 hover:bg-brand-50')}>
              {selection && (
                <td className="relative z-10 py-3 pl-4">
                  <Checkbox label={`Select ${fullName(c)}`} hideLabel checked={selected} onChange={() => selection.toggle(c.id)} />
                </td>
              )}
              <td className={td}>
                <ContactName contact={c} to={hrefFor(c)} />
              </td>
              <td className={cn(td, 'truncate text-slate-700')}>{c.email ?? <span className="text-slate-400">—</span>}</td>
              <td className={cn(td, 'hidden truncate text-slate-700 lg:table-cell')}>{c.company ?? <span className="text-slate-400">—</span>}</td>
              <td className={cn(td, 'hidden truncate text-slate-700 tabular-nums xl:table-cell')}>{c.phone ?? <span className="text-slate-400">—</span>}</td>
              <td className={td}>
                <TagList tags={c.tags} max={2} />
              </td>
              <td className={cn(td, 'whitespace-nowrap text-slate-600 tabular-nums')}>
                <time dateTime={c.createdAt} title={formatDateTime(c.createdAt)}>
                  {formatDate(c.createdAt)}
                </time>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
