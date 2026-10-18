import { Contact } from 'lucide-react'
import { Link, Outlet } from 'react-router'
import { SnackbarHost } from '@/components/ui'
import { ColdStartBanner } from '@/features/connection/ColdStartBanner'

export function AppShell() {
  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6">
          <Link to="/contacts" className="flex items-center gap-2 rounded font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-brand-600">
            <span className="flex size-7 items-center justify-center rounded-control bg-brand-700 text-white">
              <Contact aria-hidden className="size-4" />
            </span>
            CRM Workspace
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <ColdStartBanner />
        <Outlet />
      </main>
      <SnackbarHost />
    </div>
  )
}
