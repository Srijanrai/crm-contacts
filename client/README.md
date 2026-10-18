# CRM Contacts — client

React 19 + TypeScript + Vite + Tailwind CSS v4 + Redux Toolkit (slices and thunks; no RTK Query).

## Run

The client talks to the API in `../server`, so start that first (see the root README). Then:

```bash
npm install          # uses the project-local .npmrc (legacy-peer-deps, see below)
npm run dev          # http://localhost:5173, against VITE_API_URL
npm test             # Vitest + Testing Library
npm run typecheck
npm run lint         # oxlint
npm run build        # production build into dist/
```

## Environment

| Variable | Default | Meaning |
|---|---|---|
| `VITE_API_URL` | `http://localhost:4000` (in `.env.development`) | Backend base URL, no trailing slash. On Netlify, set it to the Render URL. |

## Tests

The tests render real components and pages, and run the real API client and Redux store. Network calls go to a
**test-only mock of the API** in `src/test/mockBackend/`, served through MSW. It implements the same contract and
rules as the real backend: validation messages, unique email, version conflicts, tags, bulk assignment and activity.
It is never part of the app or the production build. The app always uses the real API.

## Structure

```
src/
  api/          one fetch wrapper (errors → ApiError, slow-start detection) + endpoint functions
  app/          store, typed hooks, routes, createAppAsyncThunk
  components/   ui/ (the hand-built kit) and layout/
  features/     contacts, tags, activity, notifications, connection — each owns its slice, hooks and components
  hooks/        generic hooks (debounce, URL query state, unsaved-changes prompt, dismiss)
  validation/   pure validators used by the forms
  test/         test setup, helpers and the mock API (mockBackend/)
```

`.npmrc` sets `legacy-peer-deps=true` because npm 10.8 crashes ("Cannot read properties of null (reading 'edgesOut')")
when resolving Vitest 4's optional peer dependencies.
