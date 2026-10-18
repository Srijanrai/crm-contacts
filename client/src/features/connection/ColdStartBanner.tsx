import { useAppSelector } from '@/app/hooks'
import { Banner, Spinner } from '@/components/ui'
import { selectIsSlow } from './connectionSlice'

export const COLD_START_MESSAGE = 'Waking up the server — free hosting sleeps when idle, this can take up to a minute.'

/** Shown while a request is unusually slow, so a Render cold start doesn't look like a hang. */
export function ColdStartBanner() {
  const slow = useAppSelector(selectIsSlow)
  if (!slow) return null
  return (
    <Banner tone="warning" action={<Spinner size="sm" />} className="mb-4">
      {COLD_START_MESSAGE}
    </Banner>
  )
}
