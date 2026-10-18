import { createSlice } from '@reduxjs/toolkit'

/** `slow` is true while a request has been pending long enough to suggest a cold start. */
const connectionSlice = createSlice({
  name: 'connection',
  initialState: { slow: false },
  reducers: {
    slowStart(state) {
      state.slow = true
    },
    recovered(state) {
      state.slow = false
    },
  },
})

export const { slowStart, recovered } = connectionSlice.actions
export default connectionSlice.reducer

export const selectIsSlow = (state: { connection: { slow: boolean } }) => state.connection.slow
