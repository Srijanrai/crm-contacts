import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { useNotify } from '@/features/notifications/useNotify'
import { fetchActivity, fetchMoreActivity } from './activitySlice'

export function useActivity(contactId: string) {
  const dispatch = useAppDispatch()
  const notify = useNotify()
  const feed = useAppSelector((s) => s.activity.byContact[contactId])

  useEffect(() => {
    const promise = dispatch(fetchActivity(contactId))
    return () => promise.abort()
  }, [dispatch, contactId])

  const loadMore = useCallback(async () => {
    const result = await dispatch(fetchMoreActivity(contactId))
    if (fetchMoreActivity.rejected.match(result) && result.payload) notify.error(result.payload.message)
  }, [dispatch, contactId, notify])

  return {
    items: feed?.items ?? [],
    status: feed?.status ?? 'loading',
    error: feed?.error ?? null,
    hasMore: Boolean(feed?.nextCursor),
    loadingMore: feed?.loadingMore ?? false,
    loadMore,
    retry: useCallback(() => void dispatch(fetchActivity(contactId)), [dispatch, contactId]),
  }
}
