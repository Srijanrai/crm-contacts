import { act, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { countRequests } from '@/test/mswEvents'
import { mockDb } from '@/test/mockBackend/server'
import { useSearchParams } from 'react-router'
import { DEFAULT_LIST_QUERY, parseListQuery } from '@/validation/listQuery'
import type { ListQuery } from '@/types/api'
import { useContactList, useSaveContact } from './hooks'

let list: ReturnType<typeof useContactList>
function ListProbe({ query }: { query: ListQuery }) {
  list = useContactList(query)
  return null
}

describe('useContactList', () => {
  it('loads the first page from the backend', async () => {
    renderWithProviders(<ListProbe query={DEFAULT_LIST_QUERY} />)
    await waitFor(() => expect(list.status).toBe('succeeded'))
    expect(list.contacts).toHaveLength(20)
    expect(list.total).toBe(1000)
  })

  it('ends with the results for the last query when the query changes quickly', async () => {
    const { router } = renderWithProviders(null, {
      routes: [{ path: '/', element: <RouterProbe /> }],
    })
    await waitFor(() => expect(list.status).toBe('succeeded'))
    act(() => void router.navigate('/?q=jo'))
    act(() => void router.navigate('/?q=smith'))
    await waitFor(() => expect(list.status).toBe('succeeded'))
    expect(list.contacts.length).toBeGreaterThan(0)
    expect(list.contacts.every((c) => (c.lastName ?? '').toLowerCase().startsWith('smith') || `${c.firstName} ${c.lastName}`.toLowerCase().startsWith('smith'))).toBe(true)
  })

  it('clears the selection when the search changes', async () => {
    const { router, store } = renderWithProviders(null, { routes: [{ path: '/', element: <RouterProbe /> }] })
    await waitFor(() => expect(list.status).toBe('succeeded'))
    act(() => {
      store.dispatch({ type: 'contacts/setPageSelection', payload: { ids: [list.contacts[0].id], selected: true } })
    })
    act(() => void router.navigate('/?q=jo'))
    await waitFor(() => expect(store.getState().contacts.selection.ids).toEqual([]))
  })
})

/** Drives useContactList from the URL, like the list page does. */
function RouterProbe() {
  const [params] = useSearchParams()
  return <ListProbe query={parseListQuery(params).query} />
}

describe('useSaveContact', () => {
  let saver: ReturnType<typeof useSaveContact>
  function SaveProbe() {
    saver = useSaveContact()
    return null
  }

  it('sends a single PATCH when save is called twice at once', async () => {
    const c = structuredClone(mockDb.read().contacts[0])
    const patches = countRequests('PATCH', /^\/api\/contacts\//)
    const { store } = renderWithProviders(<SaveProbe />)
    let results: boolean[] = []
    await act(async () => {
      results = await Promise.all([
        saver.save(c.id, { version: c.version, company: 'Once' }),
        saver.save(c.id, { version: c.version, company: 'Twice' }),
      ])
    })
    patches.stop()
    expect(patches.count).toBe(1)
    expect(results).toEqual([true, false])
    expect(store.getState().notifications.items.map((n) => n.message)).toEqual(['Contact saved'])
  })

  it('does not raise a snackbar for field errors the form will show', async () => {
    const [a, b] = structuredClone(mockDb.read().contacts.filter((x) => x.email))
    const { store } = renderWithProviders(<SaveProbe />)
    await act(async () => {
      await saver.save(a.id, { version: a.version, email: b.email! })
    })
    expect(saver.error?.code).toBe('EMAIL_TAKEN')
    expect(store.getState().notifications.items).toEqual([])
  })
})
