import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { dismiss, selectVisibleNotifications, type Notification } from '@/features/notifications/notificationsSlice'
import { cn } from '@/utils/cn'

const AUTO_DISMISS_MS = 4000

const kinds = {
  success: { Icon: CircleCheck, icon: 'text-emerald-400' },
  info: { Icon: Info, icon: 'text-sky-300' },
  error: { Icon: CircleAlert, icon: 'text-red-300' },
} as const

function Snackbar({ n }: { n: Notification }) {
  const dispatch = useAppDispatch()
  useEffect(() => {
    if (n.kind === 'error') return
    const t = setTimeout(() => dispatch(dismiss(n.id)), AUTO_DISMISS_MS)
    return () => clearTimeout(t)
  }, [dispatch, n.id, n.kind])
  const { Icon, icon } = kinds[n.kind]
  return (
    <div
      role={n.kind === 'error' ? 'alert' : undefined}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-card bg-slate-900 px-4 py-3 text-sm text-white shadow-lg sm:w-96"
    >
      <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', icon)} />
      <p className="min-w-0 flex-1 leading-5">{n.message}</p>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => dispatch(dismiss(n.id))}
        className="-m-1 rounded p-1 text-slate-400 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  )
}

/** Renders the notification queue; mount once in the app shell. */
export function SnackbarHost() {
  const items = useAppSelector(selectVisibleNotifications)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end"
    >
      {items.map((n) => (
        <Snackbar key={n.id} n={n} />
      ))}
    </div>
  )
}
