import { Skeleton } from '@/components/ui'

export function ContactDetailSkeleton() {
  return (
    <div data-testid="contact-skeleton" aria-busy="true" aria-label="Loading contact">
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-card lg:col-span-2" />
        <Skeleton className="h-72 rounded-card" />
      </div>
    </div>
  )
}
