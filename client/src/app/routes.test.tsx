import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { appRoutes } from './routes'

it('redirects / to the contacts list', async () => {
  const { router } = renderWithProviders(null, { routes: appRoutes, route: '/' })
  expect(await screen.findByRole('heading', { level: 1, name: 'Contacts' })).toBeInTheDocument()
  expect(router.state.location.pathname).toBe('/contacts')
})

it('shows a not-found page for unknown URLs', async () => {
  renderWithProviders(null, { routes: appRoutes, route: '/nope' })
  expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Go to contacts' })).toHaveAttribute('href', '/contacts')
})
