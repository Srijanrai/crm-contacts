import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { useNotify } from '@/features/notifications/useNotify'
import type { ListQuery } from '@/types/api'
import { DEFAULT_LIST_QUERY, parseListQuery, serializeListQuery } from '@/validation/listQuery'

export const INVALID_LINK_MESSAGE = 'Some filters in the link were invalid and have been reset.'

/** The URL is the source of truth for the list query (refresh, back/forward and shared links keep the view). */
export function useListQueryParams() {
  const [params, setParams] = useSearchParams()
  const notify = useNotify()
  const search = params.toString()
  const { query, invalid } = useMemo(() => parseListQuery(new URLSearchParams(search)), [search])

  // Clean an invalid URL once per bad URL (the ref survives StrictMode's effect re-run).
  const handled = useRef<string | null>(null)
  useEffect(() => {
    if (!invalid.length || handled.current === search) return
    handled.current = search
    setParams(serializeListQuery(query), { replace: true })
    notify.info(INVALID_LINK_MESSAGE)
  }, [invalid, search, query, setParams, notify])

  const setQuery = useCallback(
    (patch: Partial<ListQuery>, opts: { replace?: boolean } = {}) => {
      const onlyPage = Object.keys(patch).every((k) => k === 'page')
      const next = { ...query, ...patch, page: onlyPage ? (patch.page ?? query.page) : 1 }
      setParams(serializeListQuery(next), { replace: opts.replace })
    },
    [query, setParams],
  )

  const resetFilters = useCallback(() => {
    setParams(serializeListQuery({ ...DEFAULT_LIST_QUERY, sort: query.sort, limit: query.limit }))
  }, [query.sort, query.limit, setParams])

  return { query, setQuery, resetFilters }
}
