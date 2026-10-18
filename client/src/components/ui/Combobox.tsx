import { Plus } from 'lucide-react'
import { useId, useMemo, useRef, useState } from 'react'
import { cn } from '@/utils/cn'
import { inputBase, inputRing } from './TextField'

export interface ComboboxProps {
  label: string
  options: string[]
  onSelect: (value: string) => void
  placeholder?: string
  /** Enter on text that matches no option creates it. */
  allowCreate?: boolean
  /** Returns an error message for text that can't be selected/created. */
  validate?: (value: string) => string | null
  hideLabel?: boolean
  disabled?: boolean
  hint?: string
  /** Called with the text as it is typed (cleared to "" after a pick). */
  onInputChange?: (text: string) => void
  /** Render suggestions in the flow instead of floating (inside scrolling containers such as modals). */
  inlineList?: boolean
}

type Item = { value: string; create: boolean }

const clean = (s: string) => s.trim().replace(/\s+/g, ' ')

/** Autocomplete input (ARIA combobox pattern) used for picking or creating tags. */
export function Combobox({
  label,
  options,
  onSelect,
  placeholder,
  allowCreate = false,
  validate,
  hideLabel,
  disabled,
  hint,
  inlineList = false,
  onInputChange,
}: ComboboxProps) {
  const id = useId()
  const listId = `${id}-list`
  const descId = `${id}-desc`
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const items = useMemo<Item[]>(() => {
    const needle = clean(text).toLowerCase()
    // Exact match first, then prefix matches, then other substrings — so Enter on "Lead" never picks "Hot Lead".
    const rank = (o: string) => {
      const l = o.toLowerCase()
      return l === needle ? 0 : l.startsWith(needle) ? 1 : 2
    }
    const matches = options
      .filter((o) => o.toLowerCase().includes(needle))
      .sort((a, b) => rank(a) - rank(b))
      .map((value) => ({ value, create: false }))
    const exact = options.some((o) => o.toLowerCase() === needle)
    // Never offer to create something that would be rejected (e.g. a tag the contact already has).
    if (allowCreate && needle && !exact && !validate?.(clean(text))) matches.push({ value: clean(text), create: true })
    return matches
  }, [options, text, allowCreate, validate])

  const choose = (item: Item) => {
    const message = validate?.(item.value) ?? null
    if (message) {
      setError(message)
      return
    }
    onSelect(item.value)
    setText('')
    onInputChange?.('')
    setActive(-1)
    setOpen(false)
    setError(null)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(items.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = items[active] ?? (allowCreate && clean(text) ? items.find((i) => i.create) : undefined)
      if (item) choose(item)
      // Typed text that can't be created: say why instead of doing nothing.
      else if (allowCreate && clean(text)) setError(validate?.(clean(text)) ?? null)
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation()
      setOpen(false)
      setActive(-1)
    }
  }

  const showList = open && items.length > 0
  const description = error ?? hint

  return (
    <div className="relative">
      <label htmlFor={id} className={cn('mb-1.5 block text-sm font-medium text-slate-700', hideLabel && 'sr-only')}>
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        autoComplete="off"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${id}-opt-${active}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={description ? descId : undefined}
        disabled={disabled}
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          onInputChange?.(e.target.value)
          setOpen(true)
          setError(null)
          setActive(e.target.value.trim() ? 0 : -1)
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className={cn(inputBase, inputRing(Boolean(error)), 'h-9 px-3 text-sm')}
      />
      {description && (
        <p id={descId} className={cn('mt-1.5 text-xs', error ? 'text-red-700' : 'text-slate-500')}>
          {description}
        </p>
      )}
      <div
        id={listId}
        role="listbox"
        aria-label={label}
        hidden={!showList}
        className={cn(
          'mt-1 max-h-60 w-full overflow-auto rounded-control bg-white py-1 text-sm ring-1 ring-slate-900/10',
          inlineList ? 'max-h-48' : 'absolute z-30 shadow-lg',
        )}
      >
        {items.map((item, i) => (
          <div
            key={`${item.create}-${item.value}`}
            id={`${id}-opt-${i}`}
            role="option"
            tabIndex={-1}
            aria-selected={i === active}
            // mousedown, not click: keeps focus in the input so blur doesn't close the list first.
            onMouseDown={(e) => {
              e.preventDefault()
              choose(item)
            }}
            onMouseEnter={() => setActive(i)}
            className={cn(
              'flex cursor-pointer items-center gap-2 px-3 py-1.5',
              i === active ? 'bg-brand-50 text-brand-900' : 'text-slate-800',
            )}
          >
            {item.create ? (
              <>
                <Plus aria-hidden className="size-3.5" />
                Create "{item.value}"
              </>
            ) : (
              item.value
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
