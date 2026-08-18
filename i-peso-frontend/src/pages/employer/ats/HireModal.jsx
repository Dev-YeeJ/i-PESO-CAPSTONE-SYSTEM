import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ShieldAlert, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EMPLOYMENT_TYPE_OPTIONS } from './atsConstants'
import { todayLocalDate } from './atsFormatters'

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10'

const blankValues = { startDate: '', salary: '', employmentType: '' }

export default function HireModal({ open, onClose, targets = [], isSubmitting, onSubmit }) {
  const { register, watch, reset, handleSubmit } = useForm({ defaultValues: blankValues })

  useEffect(() => {
    if (open) reset(blankValues)
  }, [open, reset])

  const startDate = watch('startDate')
  const salary = watch('salary')
  const employmentType = watch('employmentType')
  const canSubmit = startDate && Number(salary) > 0 && employmentType && !isSubmitting

  const submit = handleSubmit((values) => {
    onSubmit({
      placement_start_date: values.startDate,
      placement_salary: values.salary,
      employment_type: values.employmentType,
    })
  })

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <div className="-mx-6 -mt-6 flex items-start gap-4 rounded-t-xl border-b border-emerald-100 bg-emerald-50 p-6">
          <div className="shrink-0 rounded-full bg-emerald-100 p-2"><UserCheck className="h-6 w-6 text-emerald-700" /></div>
          <div>
            <DialogTitle className="text-emerald-900">Official placement capture</DialogTitle>
            <p className="mt-1 text-xs font-medium text-emerald-700">
              Mandatory DOLE SPRS reporting requirement · hiring {targets.length} candidate{targets.length > 1 ? 's' : ''}.
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Official start date <span className="text-red-500">*</span></span>
            <input type="date" min={todayLocalDate()} {...register('startDate', { required: true })} className={inputClass} />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Placement salary (PHP) <span className="text-red-500">*</span></span>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-slate-500">₱</span>
              <input type="number" min="1" step="0.01" placeholder="e.g. 25000" {...register('salary', { required: true, min: 1 })} className={`${inputClass} mt-0 pl-8`} />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Employment type <span className="text-red-500">*</span></span>
            <select {...register('employmentType', { required: true })} className={inputClass}>
              <option value="">Select employment type</option>
              {EMPLOYMENT_TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            This is final. Once confirmed, this application cannot be moved to another stage.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="success" onClick={submit} disabled={!canSubmit}>
            {isSubmitting ? 'Syncing…' : 'Confirm hire & sync to PESO'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
