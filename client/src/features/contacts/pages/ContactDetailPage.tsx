import { UserX } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { buttonSizes, buttonVariants, EmptyState, ErrorState, focusRing } from '@/components/ui'
import { ActivityFeed } from '@/features/activity/components/ActivityFeed'
import { useNotify } from '@/features/notifications/useNotify'
import { TagEditor } from '@/features/tags/components/TagEditor'
import { useUnsavedChangesPrompt } from '@/hooks/useUnsavedChangesPrompt'
import type { ContactFormValues } from '@/types/api'
import { cn } from '@/utils/cn'
import { fullName } from '@/utils/format'
import { ConflictDialog } from '../components/ConflictDialog'
import { ContactDetailsCard } from '../components/ContactDetailsCard'
import { ContactDetailSkeleton } from '../components/ContactDetailSkeleton'
import { ContactForm } from '../components/ContactForm'
import { Avatar } from '../components/ContactName'
import { diffConflict } from '../conflict'
import { buildUpdate, toEditBase, toFormValues, type EditBase } from '../formModel'
import { useContactDetail, useSaveContact } from '../hooks'

const FIELD_ERROR_CODES = new Set(['VALIDATION_ERROR', 'EMAIL_TAKEN'])

/** Keyed by id, so moving to another contact starts with fresh page state. */
export function ContactDetailPage() {
  const { id = '' } = useParams()
  return <ContactDetail key={id} id={id} />
}

function ContactDetail({ id }: { id: string }) {
  const { search } = useLocation()
  const backTo = `/contacts${search}`
  const { contact, status, error, retry } = useContactDetail(id)
  const saver = useSaveContact()
  const { reset: resetSave } = saver
  const notify = useNotify()
  const [editing, setEditing] = useState(false)
  const [dirty, setDirty] = useState(false)
  // What the edit started from (values + version); the base for the PATCH, dirty tracking and conflicts.
  const [editBase, setEditBase] = useState<EditBase | null>(null)
  const [resetTo, setResetTo] = useState<{ values: ContactFormValues; key: number }>()
  const prompt = useUnsavedChangesPrompt(editing && dirty)

  // Leaving the page forgets any save state.
  useEffect(() => () => void resetSave(), [resetSave])

  const stopEditing = useCallback(() => {
    setEditing(false)
    setDirty(false)
    setEditBase(null)
    resetSave()
  }, [resetSave])

  const startEditing = () => {
    if (!contact) return
    setEditBase(toEditBase(contact))
    setEditing(true)
  }

  const conflict = saver.conflict
  const conflictDiff = conflict && editBase ? diffConflict(conflict.mine, editBase.values, conflict.current) : null

  const takeLatestVersion = () => {
    saver.acceptLatest()
    stopEditing()
  }

  const keepMyChanges = () => {
    if (!conflict) return
    const latest = toFormValues(conflict.current)
    const mine = saver.keepMine() ?? {}
    setEditBase(toEditBase(conflict.current))
    setResetTo((prev) => ({ values: { ...latest, ...mine }, key: (prev?.key ?? 0) + 1 }))
    notify.info('Your changes are kept on top of the latest version. Review and save again.')
  }

  const submit = async (values: ContactFormValues) => {
    if (!contact || !editBase) return
    const input = buildUpdate(editBase, values)
    if (!input) return stopEditing()
    if (await saver.save(contact.id, input)) stopEditing()
  }

  const back = { to: backTo, label: 'All contacts' }

  if (error && (error.code === 'NOT_FOUND' || error.code === 'INVALID_ID')) {
    return (
      <>
        <PageHeader title="Contact not found" back={back} />
        <div className="rounded-card bg-white ring-1 ring-slate-200">
          <EmptyState
            icon={<UserX />}
            title="This contact doesn't exist"
            description="It may have been removed, or the link is incorrect."
            action={
              <Link to={backTo} className={cn('inline-flex items-center rounded-control font-medium', buttonVariants.secondary, buttonSizes.md, focusRing)}>
                Back to contacts
              </Link>
            }
          />
        </div>
      </>
    )
  }

  if (!contact) {
    if (status === 'failed' && error) {
      return (
        <>
          <PageHeader title="Contact" back={back} />
          <div className="rounded-card bg-white ring-1 ring-slate-200">
            <ErrorState message={error.message} onRetry={retry} />
          </div>
        </>
      )
    }
    return (
      <>
        <PageHeader title={<span className="sr-only">Loading contact</span>} back={back} />
        <ContactDetailSkeleton />
      </>
    )
  }

  const serverErrors = saver.error && FIELD_ERROR_CODES.has(saver.error.code) ? saver.error.fields : undefined

  return (
    <>
      <PageHeader title={fullName(contact)} description={contact.company ?? undefined} back={back} leading={<Avatar contact={contact} size="lg" />} />
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ContactDetailsCard
            contact={contact}
            editing={editing}
            onEdit={startEditing}
            form={
              <ContactForm
                initial={editBase?.values ?? toFormValues(contact)}
                resetTo={resetTo}
                saving={saver.status === 'loading'}
                serverErrors={serverErrors}
                onSubmit={submit}
                onCancel={stopEditing}
                onDirtyChange={setDirty}
              />
            }
          />
          <TagEditor contact={contact} />
        </div>
        <ActivityFeed contactId={contact.id} />
      </div>
      <ConflictDialog
        open={conflictDiff !== null}
        rows={conflictDiff?.mineRows ?? []}
        othersChanged={conflictDiff?.othersChanged ?? []}
        onUseLatest={takeLatestVersion}
        onKeepMine={keepMyChanges}
      />
      {prompt}
    </>
  )
}
