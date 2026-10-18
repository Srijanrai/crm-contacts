import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { buttonVariants, focusRing, type ButtonVariant } from './Button'

export interface IconButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** Accessible name; also shown as a tooltip. */
  label: string
  icon: ReactNode
  variant?: ButtonVariant
  size?: 'sm' | 'md'
}

export function IconButton({ label, icon, variant = 'ghost', size = 'md', type = 'button', className, ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-control transition-colors disabled:cursor-not-allowed disabled:opacity-55',
        focusRing,
        buttonVariants[variant],
        size === 'sm' ? 'size-7 [&_svg]:size-4' : 'size-9 [&_svg]:size-[18px]',
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  )
}
