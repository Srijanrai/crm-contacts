import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagChip, tagTone } from './TagChip'

describe('TagChip', () => {
  it('has a named remove button', async () => {
    const onRemove = vi.fn<() => void>()
    render(<TagChip name="VIP" onRemove={onRemove} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove tag VIP' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('disables removal while pending', () => {
    render(<TagChip name="VIP" onRemove={() => {}} pending />)
    expect(screen.getByRole('button', { name: 'Remove tag VIP' })).toBeDisabled()
  })

  it('gives the same tag the same colour regardless of case', () => {
    expect(tagTone('VIP')).toBe(tagTone('vip'))
  })
})
