import { screen, waitFor, within } from '@testing-library/react'
import { appRoutes } from '@/app/routes'
import { mockControls, mockDb } from '@/test/mockBackend/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { bulkResultMessage } from '../useBulkTag'

const setup = async () => {
  const r = renderWithProviders(null, { routes: appRoutes, route: '/contacts' })
  await screen.findByText('Showing 1–20 of 1,000')
  const table = screen.getByRole('table')
  const rowBoxes = () => within(table).getAllByRole('checkbox').slice(1)
  const header = () => within(table).getByRole('checkbox', { name: 'Select all contacts on this page' }) as HTMLInputElement
  return { ...r, table, rowBoxes, header }
}

describe('bulk tag assignment', () => {
  it('shows how many contacts are selected', async () => {
    const { user, rowBoxes } = await setup()
    await user.click(rowBoxes()[0])
    await user.click(rowBoxes()[1])
    expect(screen.getByText('2 selected')).toBeInTheDocument()
  })

  it('selects the whole page from the header and shows a partial state', async () => {
    const { user, rowBoxes, header } = await setup()
    await user.click(header())
    expect(rowBoxes().every((b) => (b as HTMLInputElement).checked)).toBe(true)
    expect(screen.getByText('20 selected')).toBeInTheDocument()
    await user.click(rowBoxes()[0])
    expect(header().indeterminate).toBe(true)
  })

  it('assigns a tag, reports the counts and clears the selection', async () => {
    const { user, rowBoxes, store } = await setup()
    await user.click(rowBoxes()[0])
    await user.click(rowBoxes()[1])
    await user.click(rowBoxes()[2])
    const ids = store.getState().contacts.selection.ids
    const already = mockDb.read().contacts.filter((c) => ids.includes(c.id) && c.tags.includes('VIP')).length
    await user.click(screen.getByRole('button', { name: 'Add tag' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a tag to 3 contacts' })
    await user.type(within(dialog).getByRole('combobox', { name: 'Tag' }), 'VIP{Enter}')
    await user.click(within(dialog).getByRole('button', { name: 'Add tag' }))
    const expected = bulkResultMessage({ tag: 'VIP', requested: 3, updated: 3 - already, alreadyTagged: already, notFound: [], skipped: [] })
    expect(await screen.findByText(expected)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText(/selected$/)).not.toBeInTheDocument()
    await waitFor(() => expect(mockDb.read().contacts.filter((c) => ids.includes(c.id)).every((c) => c.tags.includes('VIP'))).toBe(true))
    // The bar that opened the dialog is gone; focus lands on the results, not the page body.
    await waitFor(() => expect(screen.getByRole('region', { name: 'Contacts' })).toHaveFocus())
  })

  it('keeps the dialog and selection when the request fails', async () => {
    const { user, rowBoxes } = await setup()
    await user.click(rowBoxes()[0])
    await user.click(screen.getByRole('button', { name: 'Add tag' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByRole('combobox', { name: 'Tag' }), 'Partner{Enter}')
    mockControls.failNext(500, undefined, '/bulk/tags')
    await user.click(within(dialog).getByRole('button', { name: 'Add tag' }))
    expect(await within(dialog).findByText('Something went wrong on the server. Please try again.')).toBeInTheDocument()
    expect(screen.getByText('1 selected')).toBeInTheDocument()
  })

  it('clears the selection when the search changes', async () => {
    const { user, rowBoxes } = await setup()
    await user.click(rowBoxes()[0])
    await user.type(screen.getByRole('searchbox', { name: 'Search contacts' }), 'jo')
    await waitFor(() => expect(screen.queryByText('1 selected')).not.toBeInTheDocument())
  })
})

it('uses the typed tag without needing Enter first', async () => {
  const { user, rowBoxes } = await setup()
  await user.click(rowBoxes()[0])
  await user.click(screen.getByRole('button', { name: 'Add tag' }))
  const dialog = screen.getByRole('dialog')
  await user.type(within(dialog).getByRole('combobox', { name: 'Tag' }), 'vip')
  await user.click(within(dialog).getByRole('button', { name: 'Add tag' }))
  expect(await screen.findByText(/Tagged \d contacts? with "VIP"|Tagged 0 contacts with "VIP"/)).toBeInTheDocument()
})

describe('bulkResultMessage', () => {
  const base = { tag: 'VIP', requested: 0, updated: 0, alreadyTagged: 0, notFound: [] as string[], skipped: [] as string[] }
  it('reports only the non-zero extras', () => {
    expect(bulkResultMessage({ ...base, updated: 12 })).toBe('Tagged 12 contacts with "VIP"')
    expect(bulkResultMessage({ ...base, updated: 1, alreadyTagged: 3, notFound: ['x'] })).toBe(
      'Tagged 1 contact with "VIP" (3 already had it, 1 no longer exists)',
    )
    expect(bulkResultMessage({ ...base, alreadyTagged: 2, skipped: ['a', 'b'] })).toBe(
      'Tagged 0 contacts with "VIP" (2 already had it, 2 skipped at the 20-tag limit)',
    )
  })
})
