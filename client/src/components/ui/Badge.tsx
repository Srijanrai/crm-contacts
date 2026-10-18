import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

const tones = {
  neutral: 'bg-slate-100 text-slate-700',
  brand: 'bg-brand-100 text-brand-800',
  success: 'bg-emerald-50 text-emerald-800',
  danger: 'bg-red-50 text-red-800',
} as const

export function Badge({ tone = 'neutral', children, className }: { tone?: keyof typeof tones; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums', tones[tone], className)}>
      {children}
    </span>
  )
}
