import { Pagination, Select } from '@/components/ui'
import { formatRange } from '@/utils/format'
import { PAGE_SIZE_OPTIONS } from '@/validation/listQuery'

interface FooterProps {
  page: number
  limit: number
  total: number
  totalPages: number
  onPage: (page: number) => void
  onLimit: (limit: number) => void
}

// A hand-edited URL may carry another valid size (1–100); keep it selectable.
const sizeOptions = (limit: number) =>
  [...new Set<number>([...PAGE_SIZE_OPTIONS, limit])].sort((a, b) => a - b).map((n) => ({ value: String(n), label: String(n) }))

export function ContactsListFooter({ page, limit, total, totalPages, onPage, onLimit }: FooterProps) {
  return (
    <div className="flex flex-col items-center gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:justify-between">
      <div className="flex items-center gap-4">
        <p className="text-sm text-slate-600 tabular-nums" aria-live="polite">
          {formatRange(page, limit, total)}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600" aria-hidden>
            Rows
          </span>
          <Select
            label="Rows per page"
            hideLabel
            className="w-20"
            options={sizeOptions(limit)}
            value={String(limit)}
            onChange={(e) => onLimit(Number(e.target.value))}
          />
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={onPage} />
    </div>
  )
}
