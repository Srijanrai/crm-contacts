import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

// Static class strings so Tailwind can see them. Each tag keeps one hue everywhere.
const TONES = [
  'bg-sky-50 text-sky-800 ring-sky-200',
  'bg-violet-50 text-violet-800 ring-violet-200',
  'bg-amber-50 text-amber-900 ring-amber-200',
  'bg-emerald-50 text-emerald-800 ring-emerald-200',
  'bg-rose-50 text-rose-800 ring-rose-200',
  'bg-indigo-50 text-indigo-800 ring-indigo-200',
  'bg-lime-50 text-lime-900 ring-lime-200',
  'bg-orange-50 text-orange-900 ring-orange-200',
] as const

/** Stable string hash → index; the same text always maps to the same tone. */
export function toneIndex(text: string, size: number): number {
  let h = 0
  for (const ch of text.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % size
}

export const tagTone = (name: string): string => TONES[toneIndex(name, TONES.length)]

interface TagChipProps {
  name: string
  onRemove?: () => void
  pending?: boolean
  className?: string
}

export function TagChip({ name, onRemove, pending = false, className }: TagChipProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 max-w-full items-center gap-1 rounded-full px-2.5 text-xs font-medium ring-1 ring-inset',
        tagTone(name),
        pending && 'opacity-60',
        onRemove && 'pr-1',
        className,
      )}
    >
      <span className="truncate">{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={pending}
          aria-label={`Remove tag ${name}`}
          className="inline-flex size-4 items-center justify-center rounded-full hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-brand-600 disabled:cursor-wait"
        >
          <X aria-hidden className="size-3" />
        </button>
      )}
    </span>
  )
}
