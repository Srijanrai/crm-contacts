import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import { focusRing } from './Button'
import { IconButton } from './IconButton'
import { paginationRange } from './paginationRange'

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="Pagination" className="flex items-center gap-1">
      <IconButton label="Previous page" icon={<ChevronLeft />} size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)} />
      <span className="px-2 text-sm text-slate-600 tabular-nums sm:hidden">
        Page {page} of {totalPages}
      </span>
      <ul className="hidden items-center gap-1 sm:flex">
        {paginationRange(page, totalPages).map((item, i) =>
          item === '…' ? (
            <li key={`gap-${i}`} aria-hidden className="w-7 text-center text-slate-400">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Page ${item}`}
                onClick={() => onChange(item)}
                className={cn(
                  'h-7 min-w-7 rounded-control px-2 text-sm tabular-nums transition-colors',
                  focusRing,
                  item === page ? 'bg-brand-700 font-semibold text-white' : 'text-slate-700 hover:bg-slate-100',
                )}
              >
                {item}
              </button>
            </li>
          ),
        )}
      </ul>
      <IconButton label="Next page" icon={<ChevronRight />} size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)} />
    </nav>
  )
}
