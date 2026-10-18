import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Spinner } from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

export const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white shadow-xs hover:bg-brand-800 active:bg-brand-900',
  secondary: 'bg-white text-slate-800 shadow-xs ring-1 ring-inset ring-slate-300 hover:bg-slate-50 active:bg-slate-100',
  ghost: 'text-slate-700 hover:bg-slate-100 active:bg-slate-200',
  danger: 'bg-red-700 text-white shadow-xs hover:bg-red-800 active:bg-red-900',
}

export const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-sm',
  md: 'h-9 gap-2 px-4 text-sm',
}

export const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600'

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  leftIcon,
  disabled,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-control font-medium whitespace-nowrap transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-55',
        focusRing,
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...rest}
    >
      {/* Content stays in the layout while loading so the button keeps its width. */}
      <span className={cn('inline-flex items-center gap-[inherit]', loading && 'invisible')}>
        {leftIcon}
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size="sm" />
        </span>
      )}
    </button>
  )
}
