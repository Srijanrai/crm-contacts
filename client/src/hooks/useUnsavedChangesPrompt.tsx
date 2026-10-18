import { useEffect } from 'react'
import { useBlocker } from 'react-router'
import { Button, Modal } from '@/components/ui'

/** While `when` is true, in-app navigation asks first and closing the tab warns. Render the returned element. */
export function useUnsavedChangesPrompt(when: boolean) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => when && currentLocation.pathname !== nextLocation.pathname)

  useEffect(() => {
    if (!when) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [when])

  return (
    <Modal
      open={blocker.state === 'blocked'}
      title="Discard unsaved changes?"
      description="Your edits to this contact haven't been saved."
      size="sm"
      onClose={() => blocker.reset?.()}
      footer={
        <>
          <Button onClick={() => blocker.reset?.()}>Keep editing</Button>
          <Button variant="danger" onClick={() => blocker.proceed?.()}>
            Discard changes
          </Button>
        </>
      }
    />
  )
}
