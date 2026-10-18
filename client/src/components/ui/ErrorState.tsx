import { CloudAlert, RotateCw } from 'lucide-react'
import { Button } from './Button'

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-14 text-center">
      <CloudAlert aria-hidden className="mb-3 size-8 text-red-400" />
      <h3 className="text-base font-semibold text-slate-900">Couldn't load this</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-600">{message}</p>
      {onRetry && (
        <Button className="mt-5" leftIcon={<RotateCw aria-hidden className="size-4" />} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
