import { Briefcase, CheckCircle2, FileText, Mail, MapPin, Phone, Sparkles } from 'lucide-react'
import { Badge, Button, LoadingSkeleton } from '@/components/ui'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TERMINAL_STATUSES } from './atsConstants'
import { formatDate, formatDateTime } from './atsFormatters'

function InfoTile({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value || 'Not specified'}</p>
    </div>
  )
}

export default function ApplicantProfileModal({ open, onClose, application, detail, loading, jobTitle, onScheduleInterview }) {
  const data = detail || application
  const seeker = data?.seeker || {}
  const status = data?.status
  const skills = seeker.skills || []
  const timeline = data?.timeline || []

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0 gap-0">
        <div className="flex items-start gap-3 border-b border-amber-100 bg-amber-50 px-6 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
          <p className="text-xs leading-relaxed text-amber-800">
            <strong className="font-semibold">Official HR Onboarding Data:</strong> Demographic data is revealed in
            compliance with R.A. 10911. Evaluate candidates strictly on merit and match score before viewing these details.
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl">{seeker.name || 'Applicant'}</DialogTitle>
            <p className="font-medium text-blue-600">Applying for: {jobTitle || data?.job?.job_title}</p>
          </DialogHeader>

          {loading ? (
            <div className="mt-6 space-y-3">
              <LoadingSkeleton variant="text" rows={2} className="max-w-xs" />
              <LoadingSkeleton variant="card" rows={2} />
            </div>
          ) : (
            <>
              <div className="mb-6 mt-5 flex flex-wrap items-center gap-2">
                {status && <Badge status={status}>{data?.status_label || status}</Badge>}
                <Badge variant="neutral" icon={false}>{Math.round(Number(data?.match_percentage ?? 0))}% match</Badge>
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Contact & Summary</h3>
                  <div className="flex items-center gap-3 text-sm text-slate-700"><Mail className="h-4 w-4 text-slate-400" /> {seeker.email || 'Not provided'}</div>
                  <div className="flex items-center gap-3 text-sm text-slate-700"><Phone className="h-4 w-4 text-slate-400" /> {seeker.mobile_number || 'Not provided'}</div>
                  <div className="flex items-center gap-3 text-sm text-slate-700"><MapPin className="h-4 w-4 text-slate-400" /> {seeker.address || 'Not provided'}</div>
                  <InfoTile label="Applied on" value={formatDate(data?.applied_at)} />
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Matched skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <span key={`${skill}-${index}`} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{skill}</span>
                    ))}
                    {!skills.length && <span className="text-sm text-slate-500">No declared skills yet.</span>}
                  </div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-8 border-t border-slate-200 pt-8 md:grid-cols-2">
                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500"><Briefcase className="h-4 w-4" /> Employment profile</h3>
                  <div className="space-y-3 text-sm text-slate-600">
                    <InfoTile label="Education" value={seeker.educ_attainment} />
                    <InfoTile label="Employment status" value={seeker.employment_status} />
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500"><FileText className="h-4 w-4" /> Interview & outcome</h3>
                  <div className="space-y-3 text-sm text-slate-600">
                    {data?.interview ? (
                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-blue-900">
                        <p className="font-black">Interview scheduled</p>
                        <p className="mt-1">{formatDateTime(data.interview.schedule)}</p>
                        <p className="mt-1">{data.interview.venue_or_link || 'Venue to follow'}</p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-white p-3">No interview scheduled yet.</div>
                    )}
                    <InfoTile label="Employer remarks" value={data?.employer_remarks} />
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-slate-200 pt-8">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500"><Sparkles className="h-4 w-4" /> Application timeline</h3>
                <div className="space-y-3">
                  {timeline.length ? timeline.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                      <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.status === status ? 'bg-blue-900' : 'bg-slate-300'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{item.timestamp ? formatDateTime(item.timestamp) : 'Pending'}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No timeline entries yet.</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 bg-slate-50 px-6 py-4 sm:px-8">
          <Button variant="ghost" onClick={onClose}>Close profile</Button>
          {!loading && !TERMINAL_STATUSES.includes(status) && (
            <Button onClick={() => onScheduleInterview(data)}>Schedule interview</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
