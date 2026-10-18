import { ChevronDown } from 'lucide-react'
import { useId, type ComponentProps } from 'react'
import { cn } from '@/utils/cn'
import { inputBase, inputRing } from './TextField'

export interface SelectProps extends Omit<ComponentProps<'select'>, 'children'> {
  label: string
  options: { value: string; label: string }[]
  hideLabel?: boolean
}

export function Select({ label, options, hideLabel, id, className, ...rest }: SelectProps) {
  const autoId = useId()
  const selectId = id ?? autoId
  return (
    <div className={className}>
      <label htmlFor={selectId} className={cn('mb-1.5 block text-sm font-medium text-slate-700', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div className="relative">
        <select id={selectId} className={cn(inputBase, inputRing(false), 'h-9 cursor-pointer appearance-none pr-9 pl-3 text-sm')} {...rest}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-500" />
      </div>
    </div>
  )
}
