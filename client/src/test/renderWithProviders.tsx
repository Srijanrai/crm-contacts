import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, type ReactElement } from 'react'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { makeStore, type RootState } from '@/app/store'

interface Options {
  preloadedState?: Partial<RootState>
  /** Initial URL. */
  route?: string
  /** Route pattern the ui is mounted at (ignored when `routes` is given). */
  path?: string
  /** Full route tree, e.g. the app's routes, instead of a single route. */
  routes?: RouteObject[]
  /** Wrap in React.StrictMode (double-invokes effects, like dev). */
  strict?: boolean
}

/** Renders with a fresh store and an in-memory data router (needed for useBlocker / search params). */
export function renderWithProviders(ui: ReactElement | null, opts: Options = {}) {
  const { preloadedState, route = '/', path = '/', routes, strict = false } = opts
  const store = makeStore(preloadedState)
  const router = createMemoryRouter(routes ?? [{ path, element: ui }], { initialEntries: [route] })
  const user = userEvent.setup()
  const tree = (
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  )
  const result = render(strict ? <StrictMode>{tree}</StrictMode> : tree)
  return { store, router, user, ...result }
}
