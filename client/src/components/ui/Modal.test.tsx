import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Modal } from './Modal'

function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Modal
        open={open}
        title="Add tag"
        onClose={() => {
          onClose?.()
          setOpen(false)
        }}
        footer={<button>Assign tag</button>}
      >
        <input aria-label="Tag name" />
      </Modal>
    </>
  )
}

describe('Modal', () => {
  it('is a labelled dialog that takes focus and returns it on close', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn<() => void>()
    render(<Harness onClose={onClose} />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Add tag' })
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
    expect(screen.getByLabelText('Tag name')).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('keeps Tab focus inside the dialog', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    for (let i = 0; i < 5; i++) await user.tab()
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement)
  })
})

it('focuses the dialog itself when its body has nothing focusable', () => {
  render(<Modal open title="Heads up" onClose={() => {}} footer={<button>OK</button>}><p>Text only</p></Modal>)
  expect(screen.getByRole('dialog', { name: 'Heads up' })).toHaveFocus()
})
