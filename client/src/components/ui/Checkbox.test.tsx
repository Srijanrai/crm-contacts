import { render, screen } from '@testing-library/react'
import { Checkbox } from './Checkbox'

it('sets the DOM indeterminate property', () => {
  const { rerender } = render(<Checkbox label="Select all" indeterminate onChange={() => {}} checked={false} />)
  expect((screen.getByRole('checkbox', { name: 'Select all' }) as HTMLInputElement).indeterminate).toBe(true)
  rerender(<Checkbox label="Select all" onChange={() => {}} checked />)
  expect((screen.getByRole('checkbox', { name: 'Select all' }) as HTMLInputElement).indeterminate).toBe(false)
})
