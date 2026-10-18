import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

export const inputBase =
  'block w-full rounded-control bg-white text-slate-900 shadow-xs ring-1 ring-inset placeholder:text-slate-400 ' +
  'transition-shadow focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500'

/** Ring colours are chosen, never stacked: two ring colours in one class list resolve by CSS order, not intent. */
export const inputRing = (invalid: boolean) => (invalid ? 'ring-red-400 focus:ring-red-600' : 'ring-slate-300 focus:ring-brand-600')

export interface TextFieldProps extends ComponentProps<'input'> {
  label: string
  error?: string
  hint?: string
  hideLabel?: boolean
  leadingIcon?: ReactNode
  /** Rendered inside the right edge of the input (e.g. a clear button). */
  trailing?: ReactNode
}

export function TextField({ label, error, hint, hideLabel, leadingIcon, trailing, id, className, ...rest }: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const descId = `${inputId}-desc`
  const description = error ?? hint
  return (
    <div className={className}>
      <label htmlFor={inputId} className={cn('mb-1.5 block text-sm font-medium text-slate-700', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div className="relative">
        {leadingIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 [&_svg]:size-4">
            {leadingIcon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={description ? descId : undefined}
          className={cn(
            inputBase,
            'h-9 px-3 text-sm',
            leadingIcon && 'pl-9',
            trailing && 'pr-9',
            inputRing(Boolean(error)),
          )}
          {...rest}
        />
        {trailing && <span className="absolute inset-y-0 right-1 flex items-center">{trailing}</span>}
      </div>
      {description && (
        <p id={descId} className={cn('mt-1.5 text-xs', error ? 'text-red-700' : 'text-slate-500')}>
          {description}
        </p>
      )}
    </div>
  )
}
