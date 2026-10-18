import { screen, waitFor, within } from '@testing-library/react'
import { appRoutes } from '@/app/routes'
import { mockDb } from '@/test/mockBackend/server'
import { renderWithProviders } from '@/test/renderWithProviders'

const busiest = () => {
  const counts = new Map<string, number>()
  for (const a of mockDb.read().activities) counts.set(a.contactId, (counts.get(a.contactId) ?? 0) + 1)
  const [id, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return { id, n }
}

const open = async (id: string) => {
  const r = renderWithProviders(null, { routes: appRoutes, route: `/contacts/${id}` })
  const panel = await screen.findByRole('region', { name: 'Activity' })
  return { ...r, panel }
}

const items = (panel: HTMLElement) => within(panel).queryAllByRole('listitem')

describe('ActivityFeed', () => {
  it('shows the newest 20 first and loads more until the end', async () => {
    const { id, n } = busiest()
    expect(n).toBeGreaterThan(20)
    const { panel, user } = await open(id)
    await waitFor(() => expect(items(panel)).toHaveLength(20))
    const times = items(panel).map((li) => li.querySelector('time')!.getAttribute('datetime')!)
    expect(times).toEqual([...times].sort().reverse())
    await user.click(within(panel).getByRole('button', { name: 'Load more' }))
    await waitFor(() => expect(items(panel)).toHaveLength(n))
    expect(within(panel).queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })

  it('shows a new entry after a change is saved', async () => {
    const c = structuredClone(mockDb.read().contacts.find((x) => x.company)!)
    const { panel, user } = await open(c.id)
    await user.click(await screen.findByRole('button', { name: 'Edit details' }))
    await user.clear(screen.getByLabelText('Company'))
    await user.type(screen.getByLabelText('Company'), 'Brand New Co')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(items(panel)[0]).toHaveTextContent('Company changed'))
    expect(items(panel)[0]).toHaveTextContent('Brand New Co')
  })

  it('shows a new entry after a tag is added', async () => {
    const c = structuredClone(mockDb.read().contacts.find((x) => !x.tags.includes('Partner'))!)
    const { panel, user } = await open(c.id)
    const tags = screen.getByRole('region', { name: 'Tags' })
    await user.type(within(tags).getByRole('combobox', { name: 'Add a tag' }), 'Partner{Enter}')
    await waitFor(() => expect(items(panel)[0]).toHaveTextContent('Tag "Partner" added'))
  })

  it('says when there is no activity yet', async () => {
    const quiet = mockDb.read().contacts.find((c) => !mockDb.read().activities.some((a) => a.contactId === c.id))!
    const { panel } = await open(quiet.id)
    expect(await within(panel).findByText('No activity yet')).toBeInTheDocument()
  })
})
