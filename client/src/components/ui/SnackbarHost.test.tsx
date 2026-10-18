import { act, screen } from '@testing-library/react'
import { notify } from '@/features/notifications/notificationsSlice'
import { renderWithProviders } from '@/test/renderWithProviders'
import { SnackbarHost } from './SnackbarHost'

afterEach(() => vi.useRealTimers())

it('auto-dismisses success after 4s but keeps errors until closed', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const { store } = renderWithProviders(<SnackbarHost />)
  act(() => {
    store.dispatch(notify({ kind: 'success', message: 'Contact saved' }))
    store.dispatch(notify({ kind: 'error', message: 'Could not save' }))
  })
  expect(await screen.findByText('Contact saved')).toBeInTheDocument()
  act(() => vi.advanceTimersByTime(4000))
  expect(screen.queryByText('Contact saved')).not.toBeInTheDocument()
  expect(screen.getByText('Could not save')).toBeInTheDocument()
  act(() => screen.getByRole('button', { name: 'Dismiss notification' }).click())
  expect(screen.queryByText('Could not save')).not.toBeInTheDocument()
})

it('announces messages politely', () => {
  renderWithProviders(<SnackbarHost />)
  expect(document.querySelector('[aria-live="polite"]')).not.toBeNull()
})
