import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '@/app/store'
import { contactsAdapter } from './contactsSlice'

const entitySelectors = contactsAdapter.getSelectors((s: RootState) => s.contacts)

export const selectListState = (s: RootState) => s.contacts.list
export const selectDetailState = (s: RootState) => s.contacts.detail
export const selectSaveState = (s: RootState) => s.contacts.save
export const selectSelectedIds = (s: RootState) => s.contacts.selection.ids

export const selectListContacts = createSelector(
  [(s: RootState) => s.contacts.list.ids, (s: RootState) => s.contacts.entities],
  (ids, entities) => ids.flatMap((id) => (entities[id] ? [entities[id]] : [])),
)

export const selectContactById = (id: string) => (s: RootState) => entitySelectors.selectById(s, id)

export const selectIsSelected = (id: string) => (s: RootState) => s.contacts.selection.ids.includes(id)
