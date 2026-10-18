import { createEntityAdapter, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { SerializedApiError } from '@/api/ApiError'
import type { Contact, ContactFormValues } from '@/types/api'
import { serializeListQuery } from '@/validation/listQuery'
import { addTag, bulkTag, fetchContact, fetchContacts, removeTag, saveContact } from './thunks'

export type Status = 'idle' | 'loading' | 'succeeded' | 'failed'

export interface ConflictState {
  /** The server's latest version of the contact. */
  current: Contact
  /** The fields I tried to save. */
  mine: Partial<ContactFormValues>
}

/** Each contact is stored once by id; the list and the detail page read the same entity. */
export const contactsAdapter = createEntityAdapter<Contact>()

const initialState = contactsAdapter.getInitialState({
  list: {
    ids: [] as string[],
    total: 0,
    totalPages: 0,
    status: 'idle' as Status,
    error: null as SerializedApiError | null,
    latestRequestId: null as string | null,
    /** Serialised query the current ids/total belong to (so stale data is never mistaken for this URL's). */
    queryKey: null as string | null,
    /** Bumped when the current page is known to be stale (e.g. after a bulk change). */
    reloadKey: 0,
  },
  detail: { id: null as string | null, status: 'idle' as Status, error: null as SerializedApiError | null },
  save: { status: 'idle' as Status, error: null as SerializedApiError | null, conflict: null as ConflictState | null },
  selection: { ids: [] as string[] },
})

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    toggleSelected(state, action: PayloadAction<string>) {
      const ids = state.selection.ids
      state.selection.ids = ids.includes(action.payload) ? ids.filter((id) => id !== action.payload) : [...ids, action.payload]
    },
    setPageSelection(state, action: PayloadAction<{ ids: string[]; selected: boolean }>) {
      const { ids, selected } = action.payload
      const current = new Set(state.selection.ids)
      for (const id of ids) {
        if (selected) current.add(id)
        else current.delete(id)
      }
      state.selection.ids = [...current]
    },
    clearSelection(state) {
      state.selection.ids = []
    },
    clearConflict(state) {
      state.save.conflict = null
    },
    resolveConflictUseLatest(state) {
      // The latest contact was already stored when the conflict arrived.
      state.save = { status: 'idle', error: null, conflict: null }
    },
    resetSave(state) {
      state.save = { status: 'idle', error: null, conflict: null }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContacts.pending, (state, action) => {
        state.list.status = 'loading'
        state.list.error = null
        state.list.latestRequestId = action.meta.requestId
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.list.latestRequestId) return
        const { data, total, totalPages } = action.payload
        contactsAdapter.upsertMany(state, data)
        state.list.ids = data.map((c) => c.id)
        state.list.total = total
        state.list.totalPages = totalPages
        state.list.queryKey = serializeListQuery(action.meta.arg).toString()
        state.list.status = 'succeeded'
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        if (action.meta.requestId !== state.list.latestRequestId) return
        if (action.meta.aborted) {
          state.list.status = 'idle'
          return
        }
        state.list.status = 'failed'
        state.list.error = action.payload ?? { status: 0, code: 'UNKNOWN', message: 'Something went wrong' }
      })

      .addCase(fetchContact.pending, (state, action) => {
        state.detail = { id: action.meta.arg, status: 'loading', error: null }
      })
      .addCase(fetchContact.fulfilled, (state, action) => {
        contactsAdapter.upsertOne(state, action.payload)
        if (state.detail.id === action.meta.arg) state.detail.status = 'succeeded'
      })
      .addCase(fetchContact.rejected, (state, action) => {
        if (state.detail.id !== action.meta.arg) return
        if (action.meta.aborted) {
          state.detail.status = 'idle'
          return
        }
        state.detail.status = 'failed'
        state.detail.error = action.payload ?? { status: 0, code: 'UNKNOWN', message: 'Something went wrong' }
      })

      .addCase(saveContact.pending, (state) => {
        state.save = { status: 'loading', error: null, conflict: null }
      })
      .addCase(saveContact.fulfilled, (state, action) => {
        contactsAdapter.upsertOne(state, action.payload)
        state.save.status = 'succeeded'
      })
      .addCase(saveContact.rejected, (state, action) => {
        const error = action.payload ?? { status: 0, code: 'UNKNOWN', message: 'Something went wrong' }
        state.save.status = 'failed'
        state.save.error = error
        if (error.code === 'VERSION_CONFLICT' && error.current) {
          const { version: _version, ...mine } = action.meta.arg.input
          contactsAdapter.upsertOne(state, error.current)
          state.save.conflict = { current: error.current, mine }
        }
      })

      .addCase(addTag.fulfilled, (state, action) => {
        contactsAdapter.upsertOne(state, action.payload)
      })
      .addCase(removeTag.fulfilled, (state, action) => {
        contactsAdapter.upsertOne(state, action.payload)
      })
      .addCase(bulkTag.fulfilled, (state) => {
        state.list.reloadKey += 1
      })
  },
})

export const { toggleSelected, setPageSelection, clearSelection, clearConflict, resolveConflictUseLatest, resetSave } =
  contactsSlice.actions
export default contactsSlice.reducer
