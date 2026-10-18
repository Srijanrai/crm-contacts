import { CircleAlert, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

const tones = {
  info: { box: 'bg-sky-50 text-sky-900 ring-sky-200', Icon: Info },
  warning: { box: 'bg-amber-50 text-amber-900 ring-amber-200', Icon: TriangleAlert },
  error: { box: 'bg-red-50 text-red-900 ring-red-200', Icon: CircleAlert },
} as const

interface BannerProps {
  tone: keyof typeof tones
  children: ReactNode
  action?: ReactNode
  className?: string
}

export function Banner({ tone, children, action, className }: BannerProps) {
  const { box, Icon } = tones[tone]
  return (
    <div role="status" className={cn('flex items-start gap-3 rounded-card px-4 py-3 text-sm ring-1 ring-inset', box, className)}>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
