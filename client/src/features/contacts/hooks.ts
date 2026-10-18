import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { refreshActivity } from '@/features/activity/activitySlice'
import { useNotify } from '@/features/notifications/useNotify'
import type { ContactFormValues, ListQuery, UpdateContactInput } from '@/types/api'
import { serializeListQuery } from '@/validation/listQuery'
import { clearConflict, clearSelection, resetSave, resolveConflictUseLatest } from './contactsSlice'
import { selectContactById, selectDetailState, selectListContacts, selectListState, selectSaveState } from './selectors'
import { fetchContact, fetchContacts, saveContact } from './thunks'

/** Loads the list for `query`; a newer query aborts the older request. */
export function useContactList(query: ListQuery) {
  const dispatch = useAppDispatch()
  const contacts = useAppSelector(selectListContacts)
  const { total, totalPages, status, error, reloadKey, queryKey } = useAppSelector(selectListState)
  const [reloadToken, setReloadToken] = useState(0)
  const key = serializeListQuery(query).toString()

  useEffect(() => {
    const promise = dispatch(fetchContacts(query))
    return () => promise.abort()
    // `key` captures every field of `query`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, key, reloadToken, reloadKey])

  // A different result set means the old selection may include rows you can no longer see.
  const filterKey = JSON.stringify([query.q, query.tags, query.company, query.sort])
  const previousFilterKey = useRef(filterKey)
  useEffect(() => {
    if (previousFilterKey.current === filterKey) return
    previousFilterKey.current = filterKey
    dispatch(clearSelection())
  }, [dispatch, filterKey])

  const retry = useCallback(() => setReloadToken((t) => t + 1), [])
  return {
    contacts,
    total,
    totalPages,
    status,
    error,
    /** True when the loaded data belongs to `query` (not a previous URL still on screen). */
    isCurrent: queryKey === key && status === 'succeeded',
    isRefreshing: status === 'loading' && contacts.length > 0,
    retry,
  }
}

export function useContactDetail(id: string) {
  const dispatch = useAppDispatch()
  const contact = useAppSelector(selectContactById(id))
  const detail = useAppSelector(selectDetailState)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const promise = dispatch(fetchContact(id))
    return () => promise.abort()
  }, [dispatch, id, reloadToken])

  const current = detail.id === id
  return {
    contact,
    status: current ? detail.status : 'loading',
    error: current ? detail.error : null,
    retry: useCallback(() => setReloadToken((t) => t + 1), []),
  }
}

const FORM_ERROR_CODES = new Set(['VALIDATION_ERROR', 'EMAIL_TAKEN', 'VERSION_CONFLICT'])

/** Saves field edits. Duplicate submits while one is in flight are ignored. */
export function useSaveContact() {
  const dispatch = useAppDispatch()
  const notify = useNotify()
  const { status, error, conflict } = useAppSelector(selectSaveState)
  const inFlight = useRef(false)

  const save = useCallback(
    async (id: string, input: UpdateContactInput): Promise<boolean> => {
      if (inFlight.current) return false
      inFlight.current = true
      try {
        const result = await dispatch(saveContact({ id, input }))
        if (saveContact.fulfilled.match(result)) {
          notify.success('Contact saved')
          void dispatch(refreshActivity(id))
          return true
        }
        const err = result.payload
        // Field errors and conflicts are shown in the form / dialog instead.
        if (err && !FORM_ERROR_CODES.has(err.code)) notify.error(err.message)
        return false
      } finally {
        inFlight.current = false
      }
    },
    [dispatch, notify],
  )

  const acceptLatest = useCallback(() => dispatch(resolveConflictUseLatest()), [dispatch])
  const keepMine = useCallback((): Partial<ContactFormValues> | null => {
    const mine = conflict?.mine ?? null
    dispatch(clearConflict())
    dispatch(resetSave())
    return mine
  }, [conflict, dispatch])
  const reset = useCallback(() => dispatch(resetSave()), [dispatch])

  return { save, status, error, conflict, acceptLatest, keepMine, reset }
}
