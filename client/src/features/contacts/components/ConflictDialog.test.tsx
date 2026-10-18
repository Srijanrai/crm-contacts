import { screen, within } from '@testing-library/react'
import { appRoutes } from '@/app/routes'
import { applyContactUpdate } from '@/test/mockBackend/handlers'
import { mockDb } from '@/test/mockBackend/server'
import { renderWithProviders } from '@/test/renderWithProviders'

const TITLE = 'Someone else updated this contact while you were editing.'

async function editEmailAfterSomeoneElseChangedPhone() {
  const c = structuredClone(mockDb.read().contacts.find((x) => x.email && x.phone)!)
  const r = renderWithProviders(null, { routes: appRoutes, route: `/contacts/${c.id}` })
  const { user } = r
  await user.click(await screen.findByRole('button', { name: 'Edit details' }))
  mockDb.transact((s) => applyContactUpdate(s, c.id, { phone: '+1 555 999 0000', email: 'theirs@example.com' }, { checkVersion: false }))
  await user.clear(screen.getByLabelText('Email'))
  await user.type(screen.getByLabelText('Email'), 'mine@example.com')
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  const dialog = await screen.findByRole('dialog', { name: TITLE })
  return { ...r, c, dialog }
}

describe('ConflictDialog flow', () => {
  it('shows my value against the latest saved value', async () => {
    const { dialog } = await editEmailAfterSomeoneElseChangedPhone()
    const row = within(dialog).getByRole('row', { name: /Email/ })
    expect(within(row).getByText('mine@example.com')).toBeInTheDocument()
    expect(within(row).getByText('theirs@example.com')).toBeInTheDocument()
    expect(within(dialog).getByText('Also changed by someone else: Phone')).toBeInTheDocument()
  })

  it('keeps my edit on top of their changes and saves it', async () => {
    const { dialog, user, c } = await editEmailAfterSomeoneElseChangedPhone()
    await user.click(within(dialog).getByRole('button', { name: 'Keep my changes' }))
    expect(screen.getByLabelText('Email')).toHaveValue('mine@example.com')
    expect(screen.getByLabelText('Phone')).toHaveValue('+1 555 999 0000')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Contact saved')).toBeInTheDocument()
    const saved = mockDb.read().contacts.find((x) => x.id === c.id)!
    expect(saved).toMatchObject({ email: 'mine@example.com', phone: '+1 555 999 0000', version: c.version + 2 })
  })

  it('can discard my edit and show the latest', async () => {
    const { dialog, user } = await editEmailAfterSomeoneElseChangedPhone()
    await user.click(within(dialog).getByRole('button', { name: 'Use latest' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'theirs@example.com' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
  })
})

describe('stale saves after the contact refreshed mid-edit', () => {
  it('still detects the conflict when a tag change refreshed the contact during the edit', async () => {
    const c = structuredClone(mockDb.read().contacts.find((x) => x.email && x.phone && !x.tags.includes('Partner'))!)
    const { user } = renderWithProviders(null, { routes: appRoutes, route: `/contacts/${c.id}` })
    await user.click(await screen.findByRole('button', { name: 'Edit details' }))
    mockDb.transact((s) => applyContactUpdate(s, c.id, { phone: '+1 555 999 0000' }, { checkVersion: false }))
    // Adding a tag returns the newer contact (their phone, new version) and puts it in the store.
    await user.type(within(screen.getByRole('region', { name: 'Tags' })).getByRole('combobox', { name: 'Add a tag' }), 'Partner{Enter}')
    await screen.findByRole('button', { name: 'Remove tag Partner' })
    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'mine@example.com')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('dialog', { name: TITLE })).toBeInTheDocument()
    expect(mockDb.read().contacts.find((x) => x.id === c.id)!.phone).toBe('+1 555 999 0000')
  })
})
