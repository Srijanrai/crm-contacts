import { combineReducers, configureStore } from '@reduxjs/toolkit'
import activity from '@/features/activity/activitySlice'
import connection from '@/features/connection/connectionSlice'
import contacts from '@/features/contacts/contactsSlice'
import notifications from '@/features/notifications/notificationsSlice'
import tags from '@/features/tags/tagsSlice'

const rootReducer = combineReducers({ activity, connection, contacts, notifications, tags })

export type RootState = ReturnType<typeof rootReducer>

export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({ reducer: rootReducer, preloadedState })
}

export type AppStore = ReturnType<typeof makeStore>
export type AppDispatch = AppStore['dispatch']
