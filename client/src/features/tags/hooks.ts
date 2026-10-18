import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchTags } from './tagsSlice'

/** The tag catalogue, loaded once per session. */
export function useTagCatalogue() {
  const dispatch = useAppDispatch()
  const { items, status } = useAppSelector((s) => s.tags)
  useEffect(() => {
    // Not aborted on unmount: the catalogue is app-wide and the thunk's condition dedupes.
    void dispatch(fetchTags())
  }, [dispatch])
  return { tags: items, status }
}
