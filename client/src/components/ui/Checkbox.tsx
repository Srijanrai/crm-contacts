import { useEffect, useId, useRef, type ComponentProps } from 'react'
import { cn } from '@/utils/cn'

export interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type'> {
  label: string
  hideLabel?: boolean
  indeterminate?: boolean
}

export function Checkbox({ label, hideLabel, indeterminate = false, id, className, ...rest }: CheckboxProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className="size-4 cursor-pointer rounded border-slate-300 accent-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        {...rest}
      />
      <label htmlFor={inputId} className={cn('cursor-pointer text-sm text-slate-700', hideLabel && 'sr-only')}>
        {label}
      </label>
    </span>
  )
}
