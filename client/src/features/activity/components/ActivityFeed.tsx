import { Pencil, TagIcon, X } from 'lucide-react'
import { Panel } from '@/components/layout/Panel'
import { Button, ErrorState, Skeleton } from '@/components/ui'
import type { ActivityType } from '@/types/api'
import { cn } from '@/utils/cn'
import { formatDateTime, formatRelative } from '@/utils/format'
import { describeActivity } from '../describeActivity'
import { useActivity } from '../hooks'

const ICONS: Record<ActivityType, { Icon: typeof Pencil; tone: string }> = {
  CONTACT_UPDATED: { Icon: Pencil, tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  TAG_ADDED: { Icon: TagIcon, tone: 'bg-brand-50 text-brand-700 ring-brand-200' },
  TAG_REMOVED: { Icon: X, tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

export function ActivityFeed({ contactId }: { contactId: string }) {
  const { items, status, error, hasMore, loadingMore, loadMore, retry } = useActivity(contactId)
  const firstLoad = items.length === 0 && (status === 'loading' || status === 'idle')

  return (
    <Panel title="Activity">
      {firstLoad ? (
        <div aria-busy="true" aria-label="Loading activity" className="space-y-5">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-7 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : status === 'failed' && error && items.length === 0 ? (
        <ErrorState message={error.message} onRetry={retry} />
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">No activity yet</p>
      ) : (
        <>
          <ol className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-3.5 before:w-px before:bg-slate-200">
            {items.map((a) => {
              const { title, detail } = describeActivity(a)
              const { Icon, tone } = ICONS[a.type]
              return (
                <li key={a.id} className="relative flex gap-3">
                  <span className={cn('z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-1 ring-inset', tone)}>
                    <Icon aria-hidden className="size-3.5" />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-medium text-slate-900">{title}</p>
                    {detail && <p className="mt-0.5 text-sm break-words text-slate-600">{detail}</p>}
                    <time dateTime={a.createdAt} title={formatDateTime(a.createdAt)} className="mt-0.5 block text-xs text-slate-500">
                      {formatRelative(a.createdAt)}
                    </time>
                  </div>
                </li>
              )
            })}
          </ol>
          {hasMore && (
            <Button className="mt-5 w-full" loading={loadingMore} onClick={() => void loadMore()}>
              Load more
            </Button>
          )}
        </>
      )}
    </Panel>
  )
}
