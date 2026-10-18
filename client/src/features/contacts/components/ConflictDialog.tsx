import { Button, Modal } from '@/components/ui'
import type { EditableField } from '@/types/api'
import type { ConflictRow } from '../conflict'
import { FIELD_LABELS } from '../formModel'

export const CONFLICT_TITLE = 'Someone else updated this contact while you were editing.'

interface ConflictDialogProps {
  open: boolean
  rows: ConflictRow[]
  othersChanged: EditableField[]
  onUseLatest: () => void
  onKeepMine: () => void
}

const Value = ({ v }: { v: string }) => (v ? <>{v}</> : <span className="text-slate-400 italic">Empty</span>)

export function ConflictDialog({ open, rows, othersChanged, onUseLatest, onKeepMine }: ConflictDialogProps) {
  return (
    <Modal
      open={open}
      size="lg"
      title={CONFLICT_TITLE}
      description="Nothing was saved. Choose which version to continue with."
      // Closing must never lose work: treat it like keeping my changes.
      onClose={onKeepMine}
      footer={
        <>
          <Button onClick={onUseLatest}>Use latest</Button>
          <Button variant="primary" onClick={onKeepMine}>
            Keep my changes
          </Button>
        </>
      }
    >
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-control ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
              <tr>
                <th scope="col" className="px-3 py-2">Field</th>
                <th scope="col" className="px-3 py-2">Your value</th>
                <th scope="col" className="px-3 py-2">Latest saved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.field}>
                  <th scope="row" className="px-3 py-2.5 text-left font-medium text-slate-700">{FIELD_LABELS[r.field]}</th>
                  <td className="px-3 py-2.5 break-all text-slate-900"><Value v={r.mine} /></td>
                  <td className="px-3 py-2.5 break-all text-slate-900"><Value v={r.latest} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {othersChanged.length > 0 && (
        <p className="mt-3 text-sm text-slate-600">Also changed by someone else: {othersChanged.map((f) => FIELD_LABELS[f]).join(', ')}</p>
      )}
      <p className="mt-3 text-sm text-slate-600">
        "Keep my changes" puts your edits on top of the latest version so you can review and save again. Fields you didn't edit keep the
        latest values.
      </p>
    </Modal>
  )
}
