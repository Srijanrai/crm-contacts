import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

/** A titled surface on the detail page. */
export function Panel({ title, actions, children, className }: { title: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={cn('rounded-card bg-white ring-1 ring-slate-200', className)}>
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}
