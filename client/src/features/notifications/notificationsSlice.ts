import { createSelector, createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'

export type NotificationKind = 'success' | 'error' | 'info'

export interface Notification {
  id: string
  kind: NotificationKind
  message: string
}

const MAX_VISIBLE = 3

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: { items: [] as Notification[] },
  reducers: {
    notify: {
      reducer(state, action: PayloadAction<Notification>) {
        state.items.push(action.payload)
        // Drop what can't be shown rather than keeping it to resurface, stale, after a dismiss.
        if (state.items.length > MAX_VISIBLE) state.items.splice(0, state.items.length - MAX_VISIBLE)
      },
      prepare(input: { kind: NotificationKind; message: string }) {
        return { payload: { id: nanoid(), ...input } }
      },
    },
    dismiss(state, action: PayloadAction<string>) {
      state.items = state.items.filter((n) => n.id !== action.payload)
    },
  },
})

export const { notify, dismiss } = notificationsSlice.actions
export default notificationsSlice.reducer

type WithNotifications = { notifications: { items: Notification[] } }

/** The newest three, oldest first (so new ones stack at the bottom). */
export const selectVisibleNotifications = createSelector(
  (state: WithNotifications) => state.notifications.items,
  (items) => items.slice(-MAX_VISIBLE),
)
