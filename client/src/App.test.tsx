import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { makeStore } from '@/app/store'
import App from './App'

it('renders the contacts page through the real router', async () => {
  render(
    <Provider store={makeStore()}>
      <App />
    </Provider>,
  )
  expect(await screen.findByRole('heading', { level: 1, name: 'Contacts' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'CRM Workspace' })).toBeInTheDocument()
})
