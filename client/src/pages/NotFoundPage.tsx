import { Link } from 'react-router'
import { buttonSizes, buttonVariants, focusRing } from '@/components/ui'
import { cn } from '@/utils/cn'

export function NotFoundPage() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">The link may be broken, or the page may have moved.</p>
      <Link to="/contacts" className={cn('mt-6 inline-flex items-center rounded-control font-medium', buttonVariants.primary, buttonSizes.md, focusRing)}>
        Go to contacts
      </Link>
    </div>
  )
}
