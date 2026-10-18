import { makeStore } from '@/app/store'
import { makeContact } from '@/test/factories'
import { DEFAULT_LIST_QUERY } from '@/validation/listQuery'
import type { SerializedApiError } from '@/api/ApiError'
import { clearSelection, resolveConflictUseLatest, setPageSelection, toggleSelected } from './contactsSlice'
import { selectContactById, selectListContacts, selectListState, selectSaveState, selectSelectedIds } from './selectors'
import { fetchContacts, saveContact } from './thunks'

const q = DEFAULT_LIST_QUERY
const page = (contacts: ReturnType<typeof makeContact>[]) => ({ data: contacts, page: 1, limit: 20, total: contacts.length, totalPages: 1 })

describe('contacts slice: list', () => {
  it('ignores a response that arrives after a newer request started', () => {
    const store = makeStore()
    const older = makeContact()
    const newer = makeContact()
    store.dispatch(fetchContacts.pending('old', q))
    store.dispatch(fetchContacts.pending('new', { ...q, q: 'x' }))
    store.dispatch(fetchContacts.fulfilled(page([newer]), 'new', { ...q, q: 'x' }))
    store.dispatch(fetchContacts.fulfilled(page([older]), 'old', q))
    expect(selectListContacts(store.getState()).map((c) => c.id)).toEqual([newer.id])
    expect(selectListState(store.getState()).status).toBe('succeeded')
  })

  it('does not record an error for an aborted request', () => {
    const store = makeStore()
    store.dispatch(fetchContacts.pending('r1', q))
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' })
    store.dispatch(fetchContacts.rejected(abort, 'r1', q))
    expect(selectListState(store.getState()).error).toBeNull()
  })

  it('keeps the previous rows while a new page loads', () => {
    const store = makeStore()
    const c = makeContact()
    store.dispatch(fetchContacts.pending('r1', q))
    store.dispatch(fetchContacts.fulfilled(page([c]), 'r1', q))
    store.dispatch(fetchContacts.pending('r2', { ...q, page: 2 }))
    expect(selectListState(store.getState()).status).toBe('loading')
    expect(selectListContacts(store.getState()).map((x) => x.id)).toEqual([c.id])
  })

  it('records a failure for the latest request', () => {
    const store = makeStore()
    const error: SerializedApiError = { status: 500, code: 'INTERNAL', message: 'Boom' }
    store.dispatch(fetchContacts.pending('r1', q))
    store.dispatch(fetchContacts.rejected(null, 'r1', q, error))
    expect(selectListState(store.getState())).toMatchObject({ status: 'failed', error })
  })
})

describe('contacts slice: save', () => {
  it('updates the contact everywhere it is shown', () => {
    const store = makeStore()
    const c = makeContact()
    store.dispatch(fetchContacts.fulfilled(page([c]), 'r1', q))
    store.dispatch(fetchContacts.pending('r1', q))
    store.dispatch(fetchContacts.fulfilled(page([c]), 'r1', q))
    const saved = { ...c, email: 'new@example.com', version: 2 }
    store.dispatch(saveContact.fulfilled(saved, 's1', { id: c.id, input: { version: 1, email: 'new@example.com' } }))
    expect(selectListContacts(store.getState())[0].email).toBe('new@example.com')
    expect(selectContactById(c.id)(store.getState())?.version).toBe(2)
    expect(selectSaveState(store.getState()).status).toBe('succeeded')
  })

  it('stores the conflict with my edits (without version) and the latest contact', () => {
    const store = makeStore()
    const current = makeContact({ version: 5, email: 'theirs@example.com' })
    const error: SerializedApiError = { status: 409, code: 'VERSION_CONFLICT', message: 'Stale', current }
    const arg = { id: current.id, input: { version: 4, email: 'mine@example.com' } }
    store.dispatch(saveContact.rejected(null, 's1', arg, error))
    expect(selectSaveState(store.getState()).conflict).toEqual({ current, mine: { email: 'mine@example.com' } })
    expect(selectContactById(current.id)(store.getState())?.version).toBe(5)
    store.dispatch(resolveConflictUseLatest())
    expect(selectSaveState(store.getState()).conflict).toBeNull()
  })
})

describe('contacts slice: selection', () => {
  it('selects a page, toggles one off and clears', () => {
    const store = makeStore()
    store.dispatch(setPageSelection({ ids: ['a', 'b'], selected: true }))
    store.dispatch(toggleSelected('a'))
    expect(selectSelectedIds(store.getState())).toEqual(['b'])
    store.dispatch(setPageSelection({ ids: ['b', 'c'], selected: true }))
    expect(selectSelectedIds(store.getState())).toEqual(['b', 'c'])
    store.dispatch(setPageSelection({ ids: ['b'], selected: false }))
    expect(selectSelectedIds(store.getState())).toEqual(['c'])
    store.dispatch(clearSelection())
    expect(selectSelectedIds(store.getState())).toEqual([])
  })
})
