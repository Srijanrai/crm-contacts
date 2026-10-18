import { createSlice } from '@reduxjs/toolkit'
import { activityApi } from '@/api/activity'
import type { SerializedApiError } from '@/api/ApiError'
import { callApi, createAppAsyncThunk } from '@/app/createAppAsyncThunk'
import type { Status } from '@/features/contacts/contactsSlice'
import type { Activity } from '@/types/api'
import { LIMITS } from '@/validation/limits'

export interface ActivityFeedState {
  items: Activity[]
  nextCursor: string | null
  status: Status
  loadingMore: boolean
  error: SerializedApiError | null
  latestRequestId: string | null
}

const emptyFeed = (): ActivityFeedState => ({ items: [], nextCursor: null, status: 'idle', loadingMore: false, error: null, latestRequestId: null })

/** Loads (or reloads) the newest page for a contact. */
export const fetchActivity = createAppAsyncThunk('activity/fetch', (contactId: string, { signal, rejectWithValue }) =>
  callApi(() => activityApi.list(contactId, { limit: LIMITS.activityPageSize }, signal), rejectWithValue),
)

/** Re-reads the newest page after a change (save, tag add/remove). */
export const refreshActivity = fetchActivity

export const fetchMoreActivity = createAppAsyncThunk(
  'activity/fetchMore',
  (contactId: string, { getState, rejectWithValue }) => {
    const before = getState().activity.byContact[contactId]?.nextCursor ?? undefined
    return callApi(() => activityApi.list(contactId, { limit: LIMITS.activityPageSize, before }), rejectWithValue)
  },
  { condition: (contactId, { getState }) => Boolean(getState().activity.byContact[contactId]?.nextCursor) },
)

const activitySlice = createSlice({
  name: 'activity',
  initialState: { byContact: {} as Record<string, ActivityFeedState> },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchActivity.pending, (state, action) => {
        const feed = (state.byContact[action.meta.arg] ??= emptyFeed())
        feed.status = 'loading'
        feed.error = null
        feed.latestRequestId = action.meta.requestId
      })
      .addCase(fetchActivity.fulfilled, (state, action) => {
        const feed = state.byContact[action.meta.arg]
        if (!feed || feed.latestRequestId !== action.meta.requestId) return
        feed.items = action.payload.data
        feed.nextCursor = action.payload.nextCursor
        feed.status = 'succeeded'
      })
      .addCase(fetchActivity.rejected, (state, action) => {
        const feed = state.byContact[action.meta.arg]
        if (!feed || feed.latestRequestId !== action.meta.requestId) return
        if (action.meta.aborted) {
          feed.status = feed.items.length ? 'succeeded' : 'idle'
          return
        }
        feed.status = 'failed'
        feed.error = action.payload ?? { status: 0, code: 'UNKNOWN', message: 'Something went wrong' }
      })
      .addCase(fetchMoreActivity.pending, (state, action) => {
        state.byContact[action.meta.arg].loadingMore = true
      })
      .addCase(fetchMoreActivity.fulfilled, (state, action) => {
        const feed = state.byContact[action.meta.arg]
        const seen = new Set(feed.items.map((a) => a.id))
        feed.items.push(...action.payload.data.filter((a) => !seen.has(a.id)))
        feed.nextCursor = action.payload.nextCursor
        feed.loadingMore = false
      })
      .addCase(fetchMoreActivity.rejected, (state, action) => {
        const feed = state.byContact[action.meta.arg]
        if (feed) feed.loadingMore = false
      })
  },
})

export default activitySlice.reducer
