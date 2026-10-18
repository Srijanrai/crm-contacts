import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Combobox } from './Combobox'
import { validateTagName } from '@/validation/tag'

const setup = (props: Partial<Parameters<typeof Combobox>[0]> = {}) => {
  const onSelect = vi.fn<(v: string) => void>()
  render(<Combobox label="Add tag" options={['VIP', 'Lead', 'Customer']} onSelect={onSelect} {...props} />)
  return { onSelect, input: screen.getByRole('combobox', { name: 'Add tag' }), user: userEvent.setup() }
}

describe('Combobox', () => {
  it('filters options case-insensitively as you type', async () => {
    const { input, user } = setup()
    await user.type(input, 'vi')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['VIP'])
  })

  it('picks the highlighted option with arrow keys and Enter, then clears', async () => {
    const { input, user, onSelect } = setup()
    await user.click(input)
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(onSelect).toHaveBeenCalledWith('Lead')
    expect(input).toHaveValue('')
  })

  it('creates a new value with Enter when allowed', async () => {
    const { input, user, onSelect } = setup({ allowCreate: true, validate: validateTagName })
    await user.type(input, 'New Tag{Enter}')
    expect(onSelect).toHaveBeenCalledWith('New Tag')
  })

  it('shows the validation message and does not select invalid text', async () => {
    const { input, user, onSelect } = setup({ allowCreate: true, validate: validateTagName })
    await user.type(input, 'C++{Enter}')
    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByText('Use letters, numbers, spaces, - or _ only')).toBeInTheDocument()
  })

  it('does not create values when creation is not allowed', async () => {
    const { input, user, onSelect } = setup()
    await user.type(input, 'Nothing{Enter}')
    expect(onSelect).not.toHaveBeenCalled()
  })
})

it('can render its suggestions inline so a scrolling container cannot clip them', async () => {
  const user = userEvent.setup()
  render(<Combobox label="Tag" options={['VIP']} onSelect={() => {}} inlineList />)
  await user.click(screen.getByRole('combobox', { name: 'Tag' }))
  expect(screen.getByRole('listbox').className).not.toContain('absolute')
})

it('prefers an exact match over earlier substring matches', async () => {
  const user = userEvent.setup()
  const onSelect = vi.fn<(v: string) => void>()
  render(<Combobox label="Tag" options={['Hot Lead', 'Lead', 'Leader']} onSelect={onSelect} allowCreate />)
  await user.type(screen.getByRole('combobox', { name: 'Tag' }), 'lead{Enter}')
  expect(onSelect).toHaveBeenCalledWith('Lead')
  expect(screen.queryAllByRole('option').map((o) => o.textContent)).toEqual([])
})

it('ranks prefix matches before other substring matches', async () => {
  const user = userEvent.setup()
  render(<Combobox label="Tag" options={['Hot Lead', 'Leader']} onSelect={() => {}} />)
  await user.type(screen.getByRole('combobox', { name: 'Tag' }), 'lea')
  expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Leader', 'Hot Lead'])
})

it('does not offer to create text that fails validation', async () => {
  const user = userEvent.setup()
  render(
    <Combobox label="Tag" options={['Lead']} onSelect={() => {}} allowCreate validate={(v) => (v.toLowerCase() === 'vip' ? 'Already added' : null)} />,
  )
  await user.type(screen.getByRole('combobox', { name: 'Tag' }), 'vip')
  expect(screen.queryByRole('option', { name: /Create/ })).not.toBeInTheDocument()
  await user.clear(screen.getByRole('combobox', { name: 'Tag' }))
  await user.type(screen.getByRole('combobox', { name: 'Tag' }), 'New')
  expect(screen.getByRole('option', { name: 'Create "New"' })).toBeInTheDocument()
})
