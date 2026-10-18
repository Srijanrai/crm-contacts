import { SearchX, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, EmptyState, ErrorState } from '@/components/ui'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { BulkActionBar } from '@/features/tags/components/BulkActionBar'
import { useTagCatalogue } from '@/features/tags/hooks'
import { useListQueryParams } from '@/hooks/useListQueryParams'
import type { Contact } from '@/types/api'
import { cn } from '@/utils/cn'
import { formatNumber } from '@/utils/format'
import { ContactCardList } from '../components/ContactCardList'
import { ContactsListFooter } from '../components/ContactsListFooter'
import { ContactsListSkeleton } from '../components/ContactsListSkeleton'
import { ContactsTable } from '../components/ContactsTable'
import type { RowSelection } from '../components/selection'
import { ContactsToolbar } from '../components/ContactsToolbar'
import { clearSelection, setPageSelection, toggleSelected } from '../contactsSlice'
import { selectSelectedIds } from '../selectors'
import { useContactList } from '../hooks'

export function ContactsListPage() {
  const { query, setQuery, resetFilters } = useListQueryParams()
  const { contacts, total, totalPages, status, error, isCurrent, isRefreshing, retry } = useContactList(query)
  const { tags } = useTagCatalogue()
  const { search } = useLocation()
  const dispatch = useAppDispatch()
  const resultsRef = useRef<HTMLElement>(null)
  const selectedIds = useAppSelector(selectSelectedIds)

  const selection = useMemo<RowSelection>(() => {
    const selected = new Set(selectedIds)
    const onPage = contacts.filter((c) => selected.has(c.id)).length
    const page = onPage === 0 ? 'none' : onPage === contacts.length ? 'all' : 'some'
    return {
      isSelected: (id) => selected.has(id),
      toggle: (id) => dispatch(toggleSelected(id)),
      page,
      togglePage: () => dispatch(setPageSelection({ ids: contacts.map((c) => c.id), selected: page !== 'all' })),
    }
  }, [selectedIds, contacts, dispatch])

  // A page past the end (stale link, or filters shrank the results): go to the last page.
  // Only judged on data for this exact URL — the previous query's totalPages would misfire on back/forward.
  useEffect(() => {
    if (isCurrent && totalPages > 0 && query.page > totalPages) setQuery({ page: totalPages }, { replace: true })
  }, [isCurrent, totalPages, query.page, setQuery])

  const hrefFor = useCallback((c: Contact) => `/contacts/${c.id}${search}`, [search])
  const hasFilters = query.q !== '' || query.tags.length > 0 || query.company !== ''
  // No rows yet but some are expected: first load, or a page past the end that is being corrected.
  const waitingForRows = contacts.length === 0 && status !== 'failed' && !(status === 'succeeded' && total === 0)

  let body
  if (status === 'failed' && error) body = <ErrorState message={error.message} onRetry={retry} />
  else if (waitingForRows) body = <ContactsListSkeleton />
  else if (total === 0 && status === 'succeeded')
    body = hasFilters ? (
      <EmptyState
        icon={<SearchX />}
        title={query.q ? `No contacts match "${query.q}"` : 'No contacts match your filters'}
        description={query.q ? 'Check the spelling, or search by email or phone number instead.' : 'Try removing a tag or the company filter.'}
        action={<Button onClick={resetFilters}>Clear filters</Button>}
      />
    ) : (
      <EmptyState icon={<Users />} title="No contacts yet" description="Contacts you add will show up here." />
    )
  else
    body = (
      <>
        <div className={cn('transition-opacity', isRefreshing && 'opacity-60')} aria-busy={isRefreshing}>
          <div className="hidden md:block">
            <ContactsTable contacts={contacts} hrefFor={hrefFor} selection={selection} />
          </div>
          <div className="md:hidden">
            <ContactCardList contacts={contacts} hrefFor={hrefFor} selection={selection} />
          </div>
        </div>
        <ContactsListFooter
          page={query.page}
          limit={query.limit}
          total={total}
          totalPages={totalPages}
          onPage={(page) => setQuery({ page })}
          onLimit={(limit) => setQuery({ limit })}
        />
      </>
    )

  return (
    <>
      <PageHeader
        title="Contacts"
        description={status === 'succeeded' || total > 0 ? `${formatNumber(total)} ${hasFilters ? 'matching' : 'in total'}` : ' '}
      />
      <ContactsToolbar query={query} tagOptions={tags} onChange={setQuery} onClear={resetFilters} />
      <section ref={resultsRef} tabIndex={-1} aria-label="Contacts" className="relative overflow-hidden rounded-card bg-white ring-1 ring-slate-200 focus:outline-none">
        {isRefreshing && (
          <div className="absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-brand-100" role="progressbar" aria-label="Updating results">
            <div className="h-full w-2/5 animate-indeterminate bg-brand-600" />
          </div>
        )}
        {body}
      </section>
      <BulkActionBar
        count={selectedIds.length}
        onClear={() => dispatch(clearSelection())}
        // The bar that opened the dialog disappears with the selection; keep keyboard focus on the results.
        onAssigned={() => resultsRef.current?.focus()}
      />
    </>
  )
}
