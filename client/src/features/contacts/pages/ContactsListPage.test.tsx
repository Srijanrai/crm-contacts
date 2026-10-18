import { act, screen, waitFor, within } from '@testing-library/react'
import { appRoutes } from '@/app/routes'
import { mockControls } from '@/test/mockBackend/server'
import { renderWithProviders } from '@/test/renderWithProviders'

const renderList = (route = '/contacts') => renderWithProviders(null, { routes: appRoutes, route })
const table = () => screen.getByRole('table')

describe('ContactsListPage', () => {
  it('shows a skeleton, then the first page with the range', async () => {
    renderList()
    expect(screen.getByTestId('contacts-skeleton')).toBeInTheDocument()
    expect(await screen.findByText('Showing 1–20 of 1,000')).toBeInTheDocument()
    expect(within(table()).getAllByRole('row')).toHaveLength(21)
  })

  it('searches after a short pause and keeps the search in the URL', async () => {
    const { router, user } = renderList()
    await screen.findByText('Showing 1–20 of 1,000')
    await user.type(screen.getByRole('searchbox', { name: 'Search contacts' }), 'jon')
    await waitFor(() => expect(router.state.location.search).toBe('?q=jon'))
    expect(await within(table()).findByRole('link', { name: 'Jon Smith' })).toBeInTheDocument()
  })

  it('sorts by name', async () => {
    const { router, user } = renderList()
    await screen.findByText('Showing 1–20 of 1,000')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'Name A–Z')
    await waitFor(() => expect(router.state.location.search).toBe('?sort=name'))
  })

  it('explains an empty search and clears it', async () => {
    const { router, user } = renderList('/contacts?q=zzzzqqq')
    expect(await screen.findByText('No contacts match "zzzzqqq"')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0])
    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(await screen.findByText('Showing 1–20 of 1,000')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search contacts' })).toHaveValue('')
  })

  it('moves to the last page when the requested page is past the end', async () => {
    const { router } = renderList('/contacts?page=999')
    await waitFor(() => expect(router.state.location.search).toBe('?page=50'))
    expect(await screen.findByText('Showing 981–1,000 of 1,000')).toBeInTheDocument()
  })

  it('shows an error with a working retry', async () => {
    mockControls.failNext(500, undefined, '/api/contacts')
    const { user } = renderList()
    expect(await screen.findByText('Something went wrong on the server. Please try again.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Showing 1–20 of 1,000')).toBeInTheDocument()
  })

  it('filters by tag from the tag menu', async () => {
    const { router, user } = renderList()
    await screen.findByText('Showing 1–20 of 1,000')
    await user.click(screen.getAllByRole('button', { name: /^Tags/ })[0])
    await user.click(await screen.findByRole('checkbox', { name: 'VIP' }))
    await waitFor(() => expect(router.state.location.search).toBe('?tags=VIP'))
  })

  it('links each row to its detail page, carrying the list query', async () => {
    renderList('/contacts?sort=name')
    const link = (await within(await screen.findByRole('table')).findAllByRole('link'))[0]
    expect(link.getAttribute('href')).toMatch(/^\/contacts\/[a-f0-9]{24}\?sort=name$/)
  })
})

describe('ContactsListPage history', () => {
  it('keeps the page when going back from a smaller result set', async () => {
    const { router } = renderWithProviders(null, { routes: appRoutes, route: '/contacts?page=3' })
    expect(await screen.findByText('Showing 41–60 of 1,000')).toBeInTheDocument()
    await act(() => router.navigate('/contacts?q=jon'))
    await screen.findByText(/^Showing 1–\d+ of \d+$/)
    await act(() => router.navigate(-1))
    expect(await screen.findByText('Showing 41–60 of 1,000')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?page=3')
  })

  it('replaces the history entry for typed search text instead of adding one per pause', async () => {
    const { router, user } = renderWithProviders(null, { routes: appRoutes, route: '/contacts' })
    await screen.findByText('Showing 1–20 of 1,000')
    await user.type(screen.getByRole('searchbox', { name: 'Search contacts' }), 'jon')
    await waitFor(() => expect(router.state.location.search).toBe('?q=jon'))
    expect(router.state.historyAction).toBe('REPLACE')
  })
})
