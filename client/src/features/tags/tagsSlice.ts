import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { tagsApi } from '@/api/tags'
import { callApi, createAppAsyncThunk } from '@/app/createAppAsyncThunk'
import type { Status } from '@/features/contacts/contactsSlice'
import { tagKey } from '@/validation/tag'

export const fetchTags = createAppAsyncThunk(
  'tags/fetch',
  (_: void, { signal, rejectWithValue }) => callApi(() => tagsApi.list(signal), rejectWithValue),
  // Load once: skip while a load is running or after it succeeded.
  { condition: (_, { getState }) => !['loading', 'succeeded'].includes(getState().tags.status) },
)

const byName = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase())

/** The tag catalogue: options for the tag filter and the add-tag autocomplete. */
const tagsSlice = createSlice({
  name: 'tags',
  initialState: { items: [] as string[], status: 'idle' as Status },
  reducers: {
    addToCatalogue(state, action: PayloadAction<string>) {
      if (state.items.some((t) => tagKey(t) === tagKey(action.payload))) return
      state.items.push(action.payload)
      state.items.sort(byName)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTags.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchTags.fulfilled, (state, action) => {
        state.items = action.payload.map((t) => t.name).sort(byName)
        state.status = 'succeeded'
      })
      .addCase(fetchTags.rejected, (state, action) => {
        state.status = action.meta.aborted ? 'idle' : 'failed'
      })
  },
})

export const { addToCatalogue } = tagsSlice.actions
export default tagsSlice.reducer
