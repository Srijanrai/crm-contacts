import { useMemo } from 'react'
import { useAppDispatch } from '@/app/hooks'
import { notify } from './notificationsSlice'

export function useNotify() {
  const dispatch = useAppDispatch()
  return useMemo(
    () => ({
      success: (message: string) => dispatch(notify({ kind: 'success', message })),
      error: (message: string) => dispatch(notify({ kind: 'error', message })),
      info: (message: string) => dispatch(notify({ kind: 'info', message })),
    }),
    [dispatch],
  )
}
