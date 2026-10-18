import { act, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { useListQueryParams } from './useListQueryParams'

let api: ReturnType<typeof useListQueryParams>
function Probe() {
  api = useListQueryParams()
  return null
}

describe('useListQueryParams', () => {
  it('cleans an invalid URL once and tells the user once, even in StrictMode', async () => {
    const { router, store } = renderWithProviders(<Probe />, { route: '/?page=abc&sort=foo&q=jo', path: '/', strict: true })
    await waitFor(() => expect(router.state.location.search).toBe('?q=jo'))
    const messages = store.getState().notifications.items
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({ kind: 'info', message: 'Some filters in the link were invalid and have been reset.' })
  })

  it('resets to page 1 when anything other than the page changes', async () => {
    const { router } = renderWithProviders(<Probe />, { route: '/?page=3' })
    expect(api.query.page).toBe(3)
    act(() => api.setQuery({ q: 'jo' }))
    await waitFor(() => expect(router.state.location.search).toBe('?q=jo'))
    act(() => api.setQuery({ page: 2 }))
    await waitFor(() => expect(router.state.location.search).toBe('?q=jo&page=2'))
  })

  it('clears filters but keeps sort and page size', async () => {
    const { router } = renderWithProviders(<Probe />, { route: '/?q=jo&tags=VIP&sort=name&limit=50&page=2' })
    act(() => api.resetFilters())
    await waitFor(() => expect(router.state.location.search).toBe('?sort=name&limit=50'))
  })
})
