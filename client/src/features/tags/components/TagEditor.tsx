import { Combobox, TagChip } from '@/components/ui'
import { Panel } from '@/components/layout/Panel'
import type { Contact } from '@/types/api'
import { LIMITS } from '@/validation/limits'
import { normalizeTagName, tagKey, validateTagName } from '@/validation/tag'
import { useTagCatalogue } from '../hooks'
import { useTagActions } from '../useTagActions'

export function TagEditor({ contact }: { contact: Contact }) {
  const { tags: catalogue } = useTagCatalogue()
  const { add, remove, pending } = useTagActions(contact.id)
  const ownKeys = new Set(contact.tags.map(tagKey))
  const adding = Object.entries(pending).filter(([key, p]) => p.kind === 'adding' && !ownKeys.has(key))
  const atLimit = contact.tags.length >= LIMITS.tagsPerContact

  const validate = (v: string) => validateTagName(v) ?? (ownKeys.has(tagKey(v)) ? 'Already added' : null)

  return (
    <Panel title="Tags" actions={<span className="text-xs text-slate-500 tabular-nums">{contact.tags.length} of {LIMITS.tagsPerContact}</span>}>
      <div className="mb-4 flex min-h-6 flex-wrap gap-1.5">
        {contact.tags.length === 0 && adding.length === 0 && <p className="text-sm text-slate-500">No tags yet.</p>}
        {contact.tags.map((t) => (
          <TagChip key={t} name={t} pending={pending[tagKey(t)]?.kind === 'removing'} onRemove={() => void remove(t)} />
        ))}
        {adding.map(([key, p]) => (
          <TagChip key={`adding-${key}`} name={normalizeTagName(p.name)} pending />
        ))}
      </div>
      <Combobox
        label="Add a tag"
        hideLabel
        placeholder={atLimit ? 'Tag limit reached' : 'Add a tag…'}
        options={catalogue.filter((t) => !ownKeys.has(tagKey(t)))}
        allowCreate
        validate={validate}
        disabled={atLimit}
        hint={atLimit ? `Tag limit reached (${LIMITS.tagsPerContact})` : undefined}
        onSelect={(t) => void add(t)}
      />
    </Panel>
  )
}
