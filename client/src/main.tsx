import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { configureApiClient } from '@/api/client'
import { makeStore } from '@/app/store'
import { recovered, slowStart } from '@/features/connection/connectionSlice'
import './index.css'
import App from './App.tsx'

const store = makeStore()
configureApiClient({
  baseUrl: import.meta.env.VITE_API_URL ?? '',
  onSlowStart: () => store.dispatch(slowStart()),
  onRecovered: () => store.dispatch(recovered()),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
