import { screen, waitFor, within } from '@testing-library/react'
import { appRoutes } from '@/app/routes'
import { mockControls, mockDb } from '@/test/mockBackend/server'
import { countRequests } from '@/test/mswEvents'
import { renderWithProviders } from '@/test/renderWithProviders'

const withVip = () => structuredClone(mockDb.read().contacts.find((c) => c.tags.includes('VIP') && !c.tags.includes('Partner'))!)

async function open() {
  const c = withVip()
  const r = renderWithProviders(null, { routes: appRoutes, route: `/contacts/${c.id}` })
  const panel = await screen.findByRole('region', { name: 'Tags' })
  const input = within(panel).getByRole('combobox', { name: 'Add a tag' })
  return { ...r, c, panel, input }
}

describe('TagEditor', () => {
  it('adds an existing tag from the suggestions', async () => {
    const { user, panel, input, c } = await open()
    await user.type(input, 'Partner{Enter}')
    expect(await within(panel).findByRole('button', { name: 'Remove tag Partner' })).toBeInTheDocument()
    await waitFor(() => expect(mockDb.read().contacts.find((x) => x.id === c.id)!.tags).toContain('Partner'))
  })

  it('says a tag is already added without sending a request', async () => {
    const { user, panel, input } = await open()
    const posts = countRequests('POST', /\/tags$/)
    await user.type(input, 'vip{Enter}')
    expect(within(panel).getByText('Already added')).toBeInTheDocument()
    posts.stop()
    expect(posts.count).toBe(0)
  })

  it('removes a tag', async () => {
    const { user, panel } = await open()
    await user.click(within(panel).getByRole('button', { name: 'Remove tag VIP' }))
    await waitFor(() => expect(within(panel).queryByRole('button', { name: 'Remove tag VIP' })).not.toBeInTheDocument())
  })

  it('keeps the tag and reports the error when removal fails', async () => {
    const { user, panel } = await open()
    mockControls.failNext(500, undefined, '/tags/')
    await user.click(within(panel).getByRole('button', { name: 'Remove tag VIP' }))
    expect(await screen.findByText('Something went wrong on the server. Please try again.')).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Remove tag VIP' })).toBeEnabled()
  })

  it('creates a new tag and offers it afterwards in the catalogue', async () => {
    const { user, panel, input, store } = await open()
    await user.type(input, 'Hot Lead{Enter}')
    expect(await within(panel).findByRole('button', { name: 'Remove tag Hot Lead' })).toBeInTheDocument()
    expect(store.getState().tags.items).toContain('Hot Lead')
  })
})
