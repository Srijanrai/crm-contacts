import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge, Button, IconButton, MultiSelect, Select, TagChip, TextField } from '@/components/ui'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { ListQuery, SortKey } from '@/types/api'
import { cn } from '@/utils/cn'
import { LIMITS } from '@/validation/listQuery'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'createdAt', label: 'Oldest first' },
  { value: 'name', label: 'Name A–Z' },
  { value: '-name', label: 'Name Z–A' },
]

interface ContactsToolbarProps {
  query: ListQuery
  tagOptions: string[]
  onChange: (patch: Partial<ListQuery>, opts?: { replace?: boolean }) => void
  onClear: () => void
}

/**
 * Text that is typed locally and written to the URL after a pause. External
 * URL changes (Clear filters, back button) flow back into the input.
 */
function useDebouncedField(urlValue: string, commit: (v: string) => void) {
  const [text, setText] = useState(urlValue)
  const debounced = useDebouncedValue(text)
  useEffect(() => {
    if (debounced.trim() !== urlValue) commit(debounced.trim())
    // Only react to the debounced text; urlValue changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])
  useEffect(() => {
    if (urlValue !== debounced.trim()) setText(urlValue)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlValue])
  return [text, setText] as const
}

export function ContactsToolbar({ query, tagOptions, onChange, onClear }: ContactsToolbarProps) {
  // Typed text replaces the current history entry, so Back doesn't step through partial searches.
  const [search, setSearch] = useDebouncedField(query.q, (q) => onChange({ q }, { replace: true }))
  const [company, setCompany] = useDebouncedField(query.company, (c) => onChange({ company: c }, { replace: true }))
  const [filtersOpen, setFiltersOpen] = useState(false)

  const activeFilters = query.tags.length + (query.company ? 1 : 0)
  const hasAnyFilter = activeFilters > 0 || query.q !== ''

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-end gap-2 lg:flex-nowrap">
        <TextField
          type="search"
          label="Search contacts"
          hideLabel
          placeholder="Search by name, email or phone"
          className="min-w-0 flex-1 basis-full sm:basis-auto lg:max-w-md [&_input::-webkit-search-cancel-button]:appearance-none"
          leadingIcon={<Search />}
          maxLength={LIMITS.searchMax}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          trailing={search ? <IconButton label="Clear search" icon={<X />} size="sm" onClick={() => setSearch('')} /> : undefined}
        />
        <Button
          className="md:hidden"
          aria-expanded={filtersOpen}
          leftIcon={<SlidersHorizontal aria-hidden className="size-4" />}
          onClick={() => setFiltersOpen((o) => !o)}
        >
          Filters
          {activeFilters > 0 && <Badge tone="brand">{activeFilters}</Badge>}
        </Button>
        <div className={cn('order-last w-full gap-2 md:order-none md:flex md:w-auto', filtersOpen ? 'grid grid-cols-2' : 'hidden')}>
          <div className="md:w-40">
            <MultiSelect
              label="Tags"
              options={tagOptions}
              value={query.tags}
              max={LIMITS.tagFilterMax}
              onChange={(tags) => onChange({ tags })}
              renderOption={(t) => <TagChip name={t} />}
              emptyText="No tags yet"
            />
          </div>
          <TextField
            label="Company"
            hideLabel
            placeholder="Company"
            className="md:w-44"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
        {hasAnyFilter && (
          <Button variant="ghost" onClick={onClear}>
            Clear filters
          </Button>
        )}
        <Select
          label="Sort by"
          hideLabel
          className="ml-auto w-40"
          options={SORT_OPTIONS}
          value={query.sort}
          onChange={(e) => onChange({ sort: e.target.value as SortKey })}
        />
      </div>
    </div>
  )
}
