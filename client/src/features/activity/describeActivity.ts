import { FIELD_LABELS } from '@/features/contacts/formModel'
import type { Activity } from '@/types/api'

const show = (v: string | null) => (v ? v : 'empty')

export function describeActivity(a: Activity): { title: string; detail?: string } {
  switch (a.type) {
    case 'TAG_ADDED':
      return { title: `Tag "${a.tag}" added${a.source === 'bulk' ? ' (bulk)' : ''}` }
    case 'TAG_REMOVED':
      return { title: `Tag "${a.tag}" removed` }
    case 'CONTACT_UPDATED': {
      const changes = a.changes ?? []
      if (changes.length === 1) {
        const [c] = changes
        return { title: `${FIELD_LABELS[c.field]} changed`, detail: `${show(c.from)} → ${show(c.to)}` }
      }
      return { title: `${changes.length} fields updated`, detail: changes.map((c) => FIELD_LABELS[c.field]).join(', ') }
    }
  }
}
