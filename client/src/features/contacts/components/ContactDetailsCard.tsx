import { Pencil } from 'lucide-react'
import type { ReactNode } from 'react'
import { Panel } from '@/components/layout/Panel'
import { Button } from '@/components/ui'
import type { Contact } from '@/types/api'
import { formatDateTime } from '@/utils/format'

const linkClass = 'text-brand-800 underline-offset-2 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-brand-600'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 truncate text-sm text-slate-900">{children ?? <span className="text-slate-400">—</span>}</dd>
    </div>
  )
}

interface ContactDetailsCardProps {
  contact: Contact
  editing: boolean
  onEdit: () => void
  /** The edit form, rendered in place of the read-only fields. */
  form: ReactNode
}

export function ContactDetailsCard({ contact: c, editing, onEdit, form }: ContactDetailsCardProps) {
  return (
    <Panel
      title="Details"
      actions={
        !editing && (
          <Button size="sm" leftIcon={<Pencil aria-hidden className="size-3.5" />} onClick={onEdit}>
            Edit details
          </Button>
        )
      }
    >
      {editing ? (
        form
      ) : (
        <>
          <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <Field label="First name">{c.firstName}</Field>
            <Field label="Last name">{c.lastName}</Field>
            <Field label="Email">
              {c.email && (
                <a href={`mailto:${c.email}`} className={linkClass}>
                  {c.email}
                </a>
              )}
            </Field>
            <Field label="Phone">
              {c.phone && (
                <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`} className={`${linkClass} tabular-nums`}>
                  {c.phone}
                </a>
              )}
            </Field>
            <Field label="Company">{c.company}</Field>
          </dl>
          <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">
            Added {formatDateTime(c.createdAt)}. Last updated {formatDateTime(c.updatedAt)}.
          </p>
        </>
      )}
    </Panel>
  )
}
