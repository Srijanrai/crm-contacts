import { useCallback, useRef, useState } from 'react'
import { useAppDispatch } from '@/app/hooks'
import { addTag, removeTag } from '@/features/contacts/thunks'
import { refreshActivity } from '@/features/activity/activitySlice'
import { useNotify } from '@/features/notifications/useNotify'
import { tagKey } from '@/validation/tag'
import { addToCatalogue } from './tagsSlice'

/** In-flight tag requests by tag key, with the name as typed (for display). */
export type TagPending = Record<string, { kind: 'adding' | 'removing'; name: string }>

/** Add/remove tags on one contact. The store only changes on success, so a failure needs no rollback. */
export function useTagActions(contactId: string) {
  const dispatch = useAppDispatch()
  const notify = useNotify()
  const [pending, setPending] = useState<TagPending>({})
  const inFlight = useRef(new Set<string>())

  const run = useCallback(
    async (tag: string, kind: 'adding' | 'removing') => {
      const key = tagKey(tag)
      if (inFlight.current.has(key)) return false
      inFlight.current.add(key)
      setPending((p) => ({ ...p, [key]: { kind, name: tag } }))
      const result = await dispatch(kind === 'adding' ? addTag({ id: contactId, tag }) : removeTag({ id: contactId, tag }))
      inFlight.current.delete(key)
      setPending(({ [key]: _done, ...rest }) => rest)
      if (result.meta.requestStatus === 'fulfilled') {
        void dispatch(refreshActivity(contactId))
        if (kind === 'adding' && addTag.fulfilled.match(result)) {
          const canonical = result.payload.tags.find((t) => tagKey(t) === key)
          if (canonical) dispatch(addToCatalogue(canonical))
        }
        return true
      }
      const message = (result.payload as { message?: string } | undefined)?.message ?? 'Something went wrong'
      notify.error(message)
      return false
    },
    [contactId, dispatch, notify],
  )

  return {
    add: useCallback((tag: string) => run(tag, 'adding'), [run]),
    remove: useCallback((tag: string) => run(tag, 'removing'), [run]),
    pending,
  }
}
