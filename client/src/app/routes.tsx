import { Navigate, type RouteObject } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { RouteErrorBoundary } from '@/components/layout/ErrorBoundary'
import { ContactDetailPage } from '@/features/contacts/pages/ContactDetailPage'
import { ContactsListPage } from '@/features/contacts/pages/ContactsListPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const appRoutes: RouteObject[] = [
  {
    element: <AppShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/contacts" replace /> },
      { path: 'contacts', element: <ContactsListPage /> },
      { path: 'contacts/:id', element: <ContactDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
