import { useState } from 'react'
import { Banner, Button, Combobox, Modal, TagChip } from '@/components/ui'
import { normalizeTagName, tagKey, validateTagName } from '@/validation/tag'
import { useTagCatalogue } from '../hooks'
import { useBulkTag } from '../useBulkTag'

export function BulkTagModal({ open, onClose, onAssigned }: { open: boolean; onClose: () => void; onAssigned?: () => void }) {
  const { tags } = useTagCatalogue()
  const { assign, pending, error, resetError, selectedCount } = useBulkTag()
  // The picked tag, or else whatever valid text is typed (matched to the catalogue's casing).
  const [picked, setPicked] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const typedName = normalizeTagName(typed)
  const fromTyped = typedName && !validateTagName(typedName) ? (tags.find((t) => tagKey(t) === tagKey(typedName)) ?? typedName) : null
  const chosen = fromTyped ?? picked

  const close = () => {
    setPicked(null)
    setTyped('')
    resetError()
    onClose()
  }

  const submit = async () => {
    if (!chosen) return
    if (await assign(chosen)) {
      close()
      onAssigned?.()
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Add a tag to ${selectedCount} ${selectedCount === 1 ? 'contact' : 'contacts'}`}
      description="Contacts that already have the tag stay as they are."
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" loading={pending} disabled={!chosen} onClick={submit}>
            Add tag
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Combobox
          label="Tag"
          options={tags}
          allowCreate
          inlineList
          validate={validateTagName}
          placeholder="Choose a tag or type a new one"
          hint="Pick a suggestion, or type a tag name."
          onInputChange={(t) => {
            setTyped(t)
            if (t) setPicked(null)
            resetError()
          }}
          onSelect={(t) => {
            setPicked(t)
            resetError()
          }}
        />
        {chosen && (
          <p className="flex items-center gap-2 text-sm text-slate-700">
            Will add <TagChip name={chosen} />
          </p>
        )}
        {error && <Banner tone="error">{error.message}</Banner>}
      </div>
    </Modal>
  )
}
