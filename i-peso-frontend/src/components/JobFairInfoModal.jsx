import { useNavigate } from 'react-router-dom'
import { CalendarDays, MapPin } from 'lucide-react'
import { Button } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/**
 * Compact "which job fair is this" popup for a job-fair-linked posting.
 * Previously "View event details" hard-navigated to the generic /seeker/job-fairs
 * list with no indication of which fair it even was — this shows the fair's
 * essentials in place, then hands off to the feed already scrolled to it.
 *
 * `fair` shape: { job_fair_id, title, date, venue }.
 */
export default function JobFairInfoModal({ fair, open, onClose }) {
  const navigate = useNavigate()

  const goToFair = () => {
    onClose?.()
    navigate(`/seeker/job-fairs#fair-${fair.job_fair_id}`)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose?.()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-700" />
            {fair?.title || 'PESO Job Fair'}
          </DialogTitle>
          <DialogDescription>This job is being offered through a PESO job fair.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 text-sm">
          <p className="flex items-center gap-2 font-semibold text-slate-700"><CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />{fair?.date || 'Date to be announced'}</p>
          <p className="flex items-center gap-2 font-semibold text-slate-700"><MapPin className="h-4 w-4 shrink-0 text-slate-400" />{fair?.venue || 'Venue to be announced'}</p>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
          <Button type="button" variant="primary" onClick={goToFair}>View full job fair page</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
