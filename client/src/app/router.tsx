import { createBrowserRouter } from 'react-router'
import { appRoutes } from './routes'

// A data router is required for useBlocker (unsaved-changes prompt).
export const router = createBrowserRouter(appRoutes)
