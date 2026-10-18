import { useRouteError } from 'react-router'
import { Button } from '@/components/ui'

/** Route-level error element: an unexpected render error shows this instead of a blank page. */
export function RouteErrorBoundary() {
  const error = useRouteError()
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.'
  return (
    <div role="alert" className="mx-auto max-w-md px-6 py-20 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      <Button variant="primary" className="mt-6" onClick={() => window.location.reload()}>
        Reload the page
      </Button>
    </div>
  )
}
