import { cn } from '@/utils/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded bg-slate-200/80 motion-reduce:animate-none', className)} />
}
