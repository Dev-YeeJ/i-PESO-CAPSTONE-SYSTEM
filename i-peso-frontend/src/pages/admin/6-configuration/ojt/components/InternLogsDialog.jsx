import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Check, CheckCheck, Pencil, Plus, X } from 'lucide-react'
import { Badge, Button, ErrorState, LoadingSkeleton } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { staffService } from '@/services/staffService'
import { daysLeftLabel, formatClock, formatHours, formatWorkDate, ojtStatus } from '@/utils/ojt'
import HoursProgress from './HoursProgress'
import TimeEntryDialog from './TimeEntryDialog'

/** One intern's full time record, where the system administrator reviews it. */
export default function InternLogsDialog({ internId, canReview, onClose }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(null) // { log } — log is null when adding a day
  const [rejecting, setRejecting] = useState(null)

  const key = ['admin', 'ojt', 'intern', internId]
  const { data, isLoading, error, refetch } = useQuery({ queryKey: key, queryFn: () => staffService.getInternLogs(internId) })
  const intern = data?.intern
  const logs = data?.logs ?? []
  const pendingCount = logs.filter((log) => log.status === 'pending').length

  const refresh = (message) => {
    if (message) toast.success(message)
    queryClient.invalidateQueries({ queryKey: key })
    queryClient.invalidateQueries({ queryKey: ['admin', 'ojt', 'interns'] })
  }
  const fail = (err) => toast.error(err?.response?.data?.message ?? 'That did not go through.')

  const approve = useMutation({ mutationFn: (logId) => staffService.approveLog(logId), onSuccess: (res) => refresh(res.message), onError: fail })
  const approveAll = useMutation({ mutationFn: () => staffService.approvePending(internId), onSuccess: (res) => refresh(res.message), onError: fail })

  return (
    <>
      <Dialog open={!editing && !rejecting} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{intern?.name ?? 'Intern'}</DialogTitle>
            <DialogDescription>
              {intern ? `${intern.progress.school ?? 'School not set'} · ${daysLeftLabel(intern.progress)}` : 'Loading…'}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <LoadingSkeleton variant="table" rows={5} columns={5} />
          ) : error ? (
            <ErrorState description="This time record could not be loaded." onRetry={refetch} error={error} />
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <HoursProgress progress={intern.progress} />
                {intern.progress.hours_completed && <p className="mt-2 text-sm font-semibold text-emerald-700">Required hours completed.</p>}
                {intern.progress.incomplete_entries > 0 && (
                  <p className="mt-2 text-sm font-medium text-amber-800">
                    {intern.progress.incomplete_entries} {intern.progress.incomplete_entries === 1 ? 'day has' : 'days have'} no time out. Correct {intern.progress.incomplete_entries === 1 ? 'it' : 'them'} to count the hours.
                  </p>
                )}
              </div>

              {canReview && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" icon={CheckCheck} disabled={!pendingCount} loading={approveAll.isPending} onClick={() => approveAll.mutate()}>
                    Approve all waiting ({pendingCount})
                  </Button>
                  <Button size="sm" variant="outline" icon={Plus} onClick={() => setEditing({ log: null })}>Add a missed day</Button>
                </div>
              )}

              {logs.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No time entries yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[640px] text-sm">
                    <caption className="sr-only">Daily time record for {intern.name}</caption>
                    <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th scope="col" className="px-3 py-2">Date</th>
                        <th scope="col" className="px-3 py-2">In</th>
                        <th scope="col" className="px-3 py-2">Out</th>
                        <th scope="col" className="px-3 py-2">Hours</th>
                        <th scope="col" className="px-3 py-2">Status</th>
                        {canReview && <th scope="col" className="px-3 py-2 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {logs.map((log) => {
                        const status = ojtStatus(log.status)
                        return (
                          <tr key={log.id} className="align-top">
                            <td className="px-3 py-2.5 font-semibold text-slate-900">{formatWorkDate(log.work_date)}</td>
                            <td className="px-3 py-2.5">{formatClock(log.time_in) ?? '—'}</td>
                            <td className="px-3 py-2.5">{formatClock(log.time_out) ?? '—'}</td>
                            <td className="px-3 py-2.5">{log.hours === null ? '—' : formatHours(log.hours)}</td>
                            <td className="px-3 py-2.5">
                              <Badge status={status.variant}>{status.label}</Badge>
                              {log.corrected && <p className="mt-1 text-xs text-slate-500">Corrected</p>}
                              {log.note && <p className="mt-1 max-w-[220px] text-xs text-slate-600">“{log.note}”</p>}
                              {log.reviewed_by && <p className="mt-1 text-xs text-slate-400">by {log.reviewed_by}</p>}
                            </td>
                            {canReview && (
                              <td className="px-3 py-2.5">
                                <div className="flex justify-end gap-1">
                                  {(log.status === 'pending' || log.status === 'rejected') && (
                                    <Button size="sm" variant="ghost" icon={Check} className="text-emerald-700 hover:bg-emerald-50"
                                      loading={approve.isPending && approve.variables === log.id} onClick={() => approve.mutate(log.id)}>
                                      Approve
                                    </Button>
                                  )}
                                  {log.status === 'pending' && (
                                    <Button size="sm" variant="ghost" icon={X} className="text-red-700 hover:bg-red-50" onClick={() => setRejecting(log)}>
                                      Reject
                                    </Button>
                                  )}
                                  {log.status !== 'open' && (
                                    <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing({ log })}>
                                      {log.status === 'incomplete' ? 'Add time out' : 'Correct'}
                                    </Button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {!canReview && <p className="text-xs text-slate-500">Only the system administrator can approve or correct hours.</p>}
            </>
          )}
        </DialogContent>
      </Dialog>

      {editing && intern && (
        <TimeEntryDialog
          intern={intern}
          log={editing.log}
          onClose={() => setEditing(null)}
          onSaved={(res) => { setEditing(null); refresh(res.message) }}
        />
      )}

      {rejecting && (
        <RejectDialog
          log={rejecting}
          onClose={() => setRejecting(null)}
          onDone={(res) => { setRejecting(null); refresh(res.message) }}
        />
      )}
    </>
  )
}

function RejectDialog({ log, onClose, onDone }) {
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const reject = useMutation({
    mutationFn: () => staffService.rejectLog(log.id, note.trim()),
    onSuccess: onDone,
    onError: (err) => setError(err?.response?.data?.errors?.note?.[0] ?? err?.response?.data?.message ?? 'Could not reject this entry.'),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && !reject.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject these hours?</DialogTitle>
          <DialogDescription>
            {formatWorkDate(log.work_date)}, {formatClock(log.time_in)} – {formatClock(log.time_out)} ({formatHours(log.hours)}). They won't count. The intern sees your reason.
          </DialogDescription>
        </DialogHeader>
        <label className="block text-sm font-semibold text-slate-700">
          Reason
          <textarea rows={3} value={note} maxLength={500} onChange={(event) => { setNote(event.target.value); setError('') }}
            placeholder="e.g. Left at 3 PM per the office logbook."
            className={`mt-1.5 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20 ${error ? 'border-red-400' : 'border-slate-300 focus:border-brand-navy'}`} />
          {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={reject.isPending}>Cancel</Button>
          <Button variant="danger" loading={reject.isPending} onClick={() => (note.trim() ? reject.mutate() : setError('Say why, so the intern knows what to fix.'))}>
            Reject hours
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
