import { LoaderCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

interface SpinnerProps {
  size?: 'sm' | 'md'
  /** When given, the spinner is announced to screen readers. */
  label?: string
  className?: string
}

export function Spinner({ size = 'md', label, className }: SpinnerProps) {
  const icon = <LoaderCircle aria-hidden className={cn('animate-spin', size === 'sm' ? 'size-4' : 'size-5', className)} />
  if (!label) return icon
  return (
    <span role="status" className="inline-flex items-center">
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  )
}
