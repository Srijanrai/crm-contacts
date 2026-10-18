import { Tag, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui'
import { LIMITS } from '@/validation/limits'
import { BulkTagModal } from './BulkTagModal'

interface BulkActionBarProps {
  count: number
  onClear: () => void
  /** Called after a successful assignment; the bar (and the button that opened the dialog) is about to disappear. */
  onAssigned?: () => void
}

/** Appears while contacts are selected; sticks to the bottom of the viewport. */
export function BulkActionBar({ count, onClear, onAssigned }: BulkActionBarProps) {
  const [open, setOpen] = useState(false)
  if (count === 0) return null
  const tooMany = count > LIMITS.bulkMaxContacts
  return (
    <>
      <div className="sticky bottom-4 z-30 mx-auto mt-4 flex w-full max-w-xl flex-wrap items-center gap-x-3 gap-y-2 rounded-card bg-slate-900 px-4 py-2.5 text-sm text-white shadow-xl">
        <span className="font-medium tabular-nums">{count} selected</span>
        {tooMany && <span className="text-slate-300">Select up to {LIMITS.bulkMaxContacts} contacts</span>}
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-slate-200 hover:bg-white/10 hover:text-white"
            leftIcon={<X aria-hidden className="size-4" />}
            onClick={onClear}
          >
            Clear selection
          </Button>
          <Button size="sm" variant="primary" className="bg-brand-500 hover:bg-brand-400" disabled={tooMany} leftIcon={<Tag aria-hidden className="size-4" />} onClick={() => setOpen(true)}>
            Add tag
          </Button>
        </div>
      </div>
      <BulkTagModal open={open} onClose={() => setOpen(false)} onAssigned={onAssigned} />
    </>
  )
}
