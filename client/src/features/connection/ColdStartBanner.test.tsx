import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ColdStartBanner } from './ColdStartBanner'

const COPY = 'Waking up the server — free hosting sleeps when idle, this can take up to a minute.'

it('shows the cold-start notice while the server is slow', () => {
  renderWithProviders(<ColdStartBanner />, { preloadedState: { connection: { slow: true } } })
  expect(screen.getByText(COPY)).toBeInTheDocument()
})

it('stays hidden normally', () => {
  renderWithProviders(<ColdStartBanner />)
  expect(screen.queryByText(COPY)).not.toBeInTheDocument()
})
