import { screen, waitFor, within } from '@testing-library/react'
import { appRoutes } from '@/app/routes'
import { mockDb } from '@/test/mockBackend/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { fullName } from '@/utils/format'

const seed = () => structuredClone(mockDb.read().contacts.filter((c) => c.email))
const open = (id: string, from = '') => renderWithProviders(null, { routes: appRoutes, route: `/contacts/${id}${from}` })

describe('ContactDetailPage', () => {
  it('shows the contact', async () => {
    const [c] = seed()
    open(c.id)
    expect(await screen.findByRole('heading', { level: 1, name: fullName(c) })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: c.email! })).toHaveAttribute('href', `mailto:${c.email}`)
  })

  it('links back to the list with its query', async () => {
    const [c] = seed()
    open(c.id, '?sort=name&page=2')
    expect(await screen.findByRole('link', { name: 'All contacts' })).toHaveAttribute('href', '/contacts?sort=name&page=2')
  })

  it('edits and saves a field', async () => {
    const [c] = seed()
    const { user } = open(c.id)
    await user.click(await screen.findByRole('button', { name: 'Edit details' }))
    const email = screen.getByLabelText('Email')
    await user.clear(email)
    await user.type(email, 'changed@example.com')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Contact saved')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'changed@example.com' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
  })

  it('shows a taken email under the field', async () => {
    const [a, b] = seed()
    const { user } = open(a.id)
    await user.click(await screen.findByRole('button', { name: 'Edit details' }))
    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), b.email!)
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('This email is already used by another contact')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('explains a contact that does not exist', async () => {
    open('aaaaaaaaaaaaaaaaaaaaaaaa')
    expect(await screen.findByRole('heading', { name: "This contact doesn't exist" })).toBeInTheDocument()
  })

  it('asks before discarding unsaved edits', async () => {
    const [c] = seed()
    const { user, router } = open(c.id)
    await user.click(await screen.findByRole('button', { name: 'Edit details' }))
    await user.type(screen.getByLabelText('Company'), ' Ltd')
    await user.click(screen.getByRole('link', { name: 'All contacts' }))
    const dialog = await screen.findByRole('dialog', { name: 'Discard unsaved changes?' })
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    expect(router.state.location.pathname).toBe(`/contacts/${c.id}`)
    await user.click(screen.getByRole('link', { name: 'All contacts' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Discard changes' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/contacts'))
  })
})
