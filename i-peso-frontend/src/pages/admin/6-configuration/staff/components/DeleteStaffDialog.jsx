import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from '@/lib/toast'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { staffService } from '@/services/staffService'
import { errorMessage } from '../staffDisplay'

const CONFIRM_WORD = 'DELETE'

/**
 * Permanent deletion of a staff account. Unlike deactivation it can't be undone,
 * so the admin types DELETE and sees exactly what is erased and what is kept.
 */
export default function DeleteStaffDialog({ staff, open, onOpenChange, onDeleted }) {
  const [typed, setTyped] = useState('')

  const remove = useMutation({
    mutationFn: () => staffService.deleteStaff(staff.id),
    onSuccess: (data) => {
      toast.success(
        data.released_cases > 0
          ? `${data.message} ${data.released_cases} open safety case(s) went back to the unassigned queue.`
          : data.message
      )
      setTyped('')
      onDeleted(data)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const close = (next) => {
    if (remove.isPending) return
    if (!next) setTyped('')
    onOpenChange(next)
  }

  if (!staff) return null

  const confirmed = typed.trim() === CONFIRM_WORD

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {staff.name}'s account permanently?</DialogTitle>
          <DialogDescription>This can't be undone. If they might come back, keep the account deactivated instead.</DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <li className="flex gap-2"><span aria-hidden>•</span>They can never sign in again, and the account can't be restored.</li>
          <li className="flex gap-2"><span aria-hidden>•</span>Their email and mobile number are erased. {staff.email} can be used for a new account.</li>
          <li className="flex gap-2"><span aria-hidden>•</span>Open safety cases assigned to them go back to the unassigned queue.</li>
        </ul>

        <p className="flex gap-2 text-sm text-slate-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          Job fairs, programs, reviews and other records they handled are kept and still show their name.
        </p>

        <label className="block text-sm font-medium text-slate-700">
          Type <span className="font-mono font-bold text-red-700">{CONFIRM_WORD}</span> to confirm
          <input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && confirmed && !remove.isPending) remove.mutate() }}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
        </label>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)} disabled={remove.isPending}>Cancel</Button>
          <Button variant="danger" icon={Trash2} loading={remove.isPending} disabled={!confirmed} onClick={() => remove.mutate()}>
            {remove.isPending ? 'Deleting…' : 'Delete account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
