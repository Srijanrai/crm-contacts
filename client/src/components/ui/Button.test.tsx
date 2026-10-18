import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'
import { IconButton } from './IconButton'

describe('Button', () => {
  it('is disabled and busy while loading', async () => {
    const onClick = vi.fn<() => void>()
    render(<Button loading onClick={onClick}>Save changes</Button>)
    const button = screen.getByRole('button', { name: 'Save changes' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Cancel</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })
})

it('IconButton is named by its label', () => {
  render(<IconButton label="Clear search" icon={<span />} />)
  expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument()
})
