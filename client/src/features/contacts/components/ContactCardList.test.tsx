import { screen } from '@testing-library/react'
import { makeContact } from '@/test/factories'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ContactCardList } from './ContactCardList'

const contacts = [
  makeContact({ firstName: 'Ada', lastName: 'Lovelace', phone: '+44 20 7946 0958', createdAt: '2026-03-05T10:00:00.000Z' }),
  makeContact({ firstName: 'Bob', lastName: 'Byte' }),
]

describe('ContactCardList (mobile)', () => {
  it('shows the same data as the table, including phone and created date', () => {
    renderWithProviders(<ContactCardList contacts={contacts} hrefFor={(c) => `/contacts/${c.id}`} />)
    expect(screen.getByText('+44 20 7946 0958')).toBeInTheDocument()
    expect(screen.getByText('Added 5 Mar 2026')).toBeInTheDocument()
  })

  it('offers a select-all checkbox for the page', async () => {
    const togglePage = vi.fn<() => void>()
    const { user } = renderWithProviders(
      <ContactCardList
        contacts={contacts}
        hrefFor={(c) => `/contacts/${c.id}`}
        selection={{ isSelected: () => false, toggle: () => {}, page: 'some', togglePage }}
      />,
    )
    const all = screen.getByRole('checkbox', { name: 'Select all contacts on this page' }) as HTMLInputElement
    expect(all.indeterminate).toBe(true)
    await user.click(all)
    expect(togglePage).toHaveBeenCalledTimes(1)
  })
})
