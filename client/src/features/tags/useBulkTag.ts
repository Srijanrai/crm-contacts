import { useCallback, useState } from 'react'
import type { SerializedApiError } from '@/api/ApiError'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { clearSelection } from '@/features/contacts/contactsSlice'
import { selectSelectedIds } from '@/features/contacts/selectors'
import { bulkTag } from '@/features/contacts/thunks'
import { useNotify } from '@/features/notifications/useNotify'
import type { BulkTagResult } from '@/types/api'
import { LIMITS } from '@/validation/limits'
import { addToCatalogue } from './tagsSlice'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** `Tagged 12 contacts with "VIP" (3 already had it, 1 no longer exists)` */
export function bulkResultMessage(r: BulkTagResult): string {
  const extras = [
    r.alreadyTagged > 0 && `${r.alreadyTagged} already had it`,
    r.skipped.length > 0 && `${r.skipped.length} skipped at the ${LIMITS.tagsPerContact}-tag limit`,
    r.notFound.length > 0 && `${r.notFound.length} no longer ${r.notFound.length === 1 ? 'exists' : 'exist'}`,
  ].filter(Boolean)
  const head = `Tagged ${plural(r.updated, 'contact', 'contacts')} with "${r.tag}"`
  return extras.length ? `${head} (${extras.join(', ')})` : head
}

/** Assigns a tag to every selected contact. */
export function useBulkTag() {
  const dispatch = useAppDispatch()
  const notify = useNotify()
  const selectedIds = useAppSelector(selectSelectedIds)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<SerializedApiError | null>(null)

  const assign = useCallback(
    async (tag: string): Promise<BulkTagResult | null> => {
      setPending(true)
      setError(null)
      const result = await dispatch(bulkTag({ contactIds: selectedIds, tag }))
      setPending(false)
      if (bulkTag.fulfilled.match(result)) {
        notify.success(bulkResultMessage(result.payload))
        dispatch(addToCatalogue(result.payload.tag))
        dispatch(clearSelection()) // the list refetches via reloadKey
        return result.payload
      }
      setError(result.payload ?? { status: 0, code: 'UNKNOWN', message: 'Something went wrong' })
      return null
    },
    [dispatch, notify, selectedIds],
  )

  return { assign, pending, error, resetError: () => setError(null), selectedCount: selectedIds.length }
}
