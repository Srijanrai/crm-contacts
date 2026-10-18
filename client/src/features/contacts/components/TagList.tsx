import { TagChip } from '@/components/ui'

/** Tag chips with a "+N" overflow, for dense rows. */
export function TagList({ tags, max = 3 }: { tags: string[]; max?: number }) {
  if (!tags.length) return <span className="text-slate-400">—</span>
  const shown = tags.slice(0, max)
  const rest = tags.length - shown.length
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((t) => (
        <TagChip key={t} name={t} />
      ))}
      {rest > 0 && (
        <span className="text-xs font-medium text-slate-500" title={tags.slice(max).join(', ')}>
          +{rest}
        </span>
      )}
    </div>
  )
}
