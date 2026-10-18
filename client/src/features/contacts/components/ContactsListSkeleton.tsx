import { Skeleton } from '@/components/ui'

export function ContactsListSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div data-testid="contacts-skeleton" aria-busy="true" aria-label="Loading contacts" className="divide-y divide-slate-100">
      <div className="h-10 bg-slate-50/80" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="hidden h-3.5 w-48 md:block" />
          <Skeleton className="ml-auto h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}
