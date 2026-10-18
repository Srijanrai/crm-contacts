import { Check, ChevronDown } from 'lucide-react'
import { useCallback, useId, useRef, useState } from 'react'
import { useDismiss } from '@/hooks/useDismiss'
import { cn } from '@/utils/cn'
import { buttonSizes, buttonVariants, focusRing } from './Button'
import { Badge } from './Badge'

export interface MultiSelectProps {
  label: string
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
  max?: number
  /** Renders each option (e.g. as a coloured tag chip). */
  renderOption?: (option: string) => React.ReactNode
  emptyText?: string
}

/** A button that opens a checkbox list; used for the tag filter. */
export function MultiSelect({ label, options, value, onChange, max, renderOption, emptyText = 'Nothing to choose from' }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const listId = useId()
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, close, open)

  const selected = new Set(value.map((v) => v.toLowerCase()))
  const atMax = max !== undefined && value.length >= max

  const toggle = (option: string) => {
    const key = option.toLowerCase()
    if (selected.has(key)) onChange(value.filter((v) => v.toLowerCase() !== key))
    else if (!atMax) onChange([...value, option])
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex w-full items-center justify-between rounded-control font-medium',
          buttonVariants.secondary,
          buttonSizes.md,
          focusRing,
        )}
      >
        <span className="flex items-center gap-2">
          {label}
          {value.length > 0 && <Badge tone="brand">{value.length}</Badge>}
        </span>
        <ChevronDown aria-hidden className="size-4 text-slate-500" />
      </button>
      {open && (
        <div
          id={listId}
          role="group"
          aria-label={label}
          className="absolute z-30 mt-1 max-h-72 w-60 overflow-auto rounded-control bg-white p-1 shadow-lg ring-1 ring-slate-900/10"
        >
          {options.length === 0 && <p className="px-3 py-2 text-sm text-slate-500">{emptyText}</p>}
          {options.map((option) => {
            const checked = selected.has(option.toLowerCase())
            return (
              <label
                key={option}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-sm hover:bg-slate-50',
                  !checked && atMax && 'cursor-not-allowed opacity-50',
                )}
              >
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={checked}
                  disabled={!checked && atMax}
                  onChange={() => toggle(option)}
                />
                <span
                  aria-hidden
                  className={cn(
                    'flex size-4 items-center justify-center rounded ring-1 ring-inset peer-focus-visible:outline-2 peer-focus-visible:outline-brand-600',
                    checked ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white ring-slate-300',
                  )}
                >
                  {checked && <Check className="size-3" strokeWidth={3} />}
                </span>
                {renderOption ? renderOption(option) : option}
              </label>
            )
          })}
          {atMax && <p className="px-2 py-1.5 text-xs text-slate-500">You can filter by up to {max} tags.</p>}
        </div>
      )}
    </div>
  )
}
