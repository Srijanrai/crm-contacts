import { render, screen } from '@testing-library/react'
import { TextField } from './TextField'
import { Select } from './Select'

describe('TextField', () => {
  it('links the label and marks errors for assistive tech', () => {
    render(<TextField label="Email" error="Enter a valid email" defaultValue="x" />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Enter a valid email')
  })

  it('describes the input with its hint when there is no error', () => {
    render(<TextField label="Phone" hint="Include the country code" />)
    expect(screen.getByLabelText('Phone')).toHaveAccessibleDescription('Include the country code')
    expect(screen.getByLabelText('Phone')).not.toHaveAttribute('aria-invalid')
  })
})

it('Select renders labelled options', () => {
  render(<Select label="Sort" options={[{ value: 'name', label: 'Name A–Z' }]} value="name" onChange={() => {}} />)
  expect(screen.getByRole('combobox', { name: 'Sort' })).toHaveValue('name')
})

it('uses only the error ring colour when invalid (no conflicting default ring)', () => {
  render(<TextField label="Email" error="Enter a valid email" />)
  const cls = screen.getByLabelText('Email').className
  expect(cls).toContain('ring-red-400')
  expect(cls).not.toContain('ring-slate-300')
})
