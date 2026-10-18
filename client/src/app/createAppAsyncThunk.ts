import { createAsyncThunk } from '@reduxjs/toolkit'
import { isAbortError, serializeApiError, toApiError, type SerializedApiError } from '@/api/ApiError'
import type { AppDispatch, RootState } from './store'

export const createAppAsyncThunk = createAsyncThunk.withTypes<{
  state: RootState
  dispatch: AppDispatch
  rejectValue: SerializedApiError
}>()

/**
 * Runs an API call inside a thunk: aborts propagate as aborts (RTK marks them
 * meta.aborted), every other failure becomes a serialised ApiError payload.
 */
export async function callApi<T, R>(fn: () => Promise<T>, rejectWithValue: (e: SerializedApiError) => R): Promise<T | R> {
  try {
    return await fn()
  } catch (e) {
    if (isAbortError(e)) throw e
    return rejectWithValue(serializeApiError(toApiError(e)))
  }
}
