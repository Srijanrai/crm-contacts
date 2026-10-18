import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import type { ContactFormValues, FieldErrors } from '@/types/api'
import { ContactForm } from './ContactForm'

const initial: ContactFormValues = { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', phone: '', company: '' }

function Harness({ onSubmit, serverErrors }: { onSubmit: (v: ContactFormValues) => void; serverErrors?: FieldErrors }) {
  const [saving, setSaving] = useState(false)
  return (
    <ContactForm
      initial={initial}
      saving={saving}
      serverErrors={serverErrors}
      onCancel={() => {}}
      onSubmit={(v) => {
        setSaving(true)
        onSubmit(v)
      }}
    />
  )
}

const setup = (serverErrors?: FieldErrors) => {
  const onSubmit = vi.fn<(v: ContactFormValues) => void>()
  render(<Harness onSubmit={onSubmit} serverErrors={serverErrors} />)
  return { onSubmit, user: userEvent.setup() }
}

describe('ContactForm', () => {
  it('enables Save only once something changed', async () => {
    const { user } = setup()
    const save = screen.getByRole('button', { name: 'Save changes' })
    expect(save).toBeDisabled()
    await user.type(screen.getByLabelText('Company'), 'Engines')
    expect(save).toBeEnabled()
  })

  it('shows client validation and focuses the first invalid field', async () => {
    const { user, onSubmit } = setup()
    await user.clear(screen.getByLabelText(/First name/))
    await user.type(screen.getByLabelText('Email'), 'x')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('First name is required')).toBeInTheDocument()
    expect(screen.getByLabelText(/First name/)).toHaveFocus()
  })

  it('validates a field when it loses focus', async () => {
    const { user } = setup()
    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'nope')
    await user.tab()
    expect(screen.getByText('Enter a valid email')).toBeInTheDocument()
  })

  it('shows server errors until the field is edited', async () => {
    const { user } = setup({ email: 'This email is already used by another contact' })
    expect(screen.getByText('This email is already used by another contact')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Email'), 'm')
    expect(screen.queryByText('This email is already used by another contact')).not.toBeInTheDocument()
  })

  it('submits once when Enter is pressed twice', async () => {
    const { user, onSubmit } = setup()
    await user.type(screen.getByLabelText('Company'), 'Engines{Enter}{Enter}')
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({ ...initial, company: 'Engines' })
  })
})
