import { Briefcase, CheckCircle2, FileText, Mail, MapPin, Phone, Sparkles, X, GraduationCap, Building } from 'lucide-react'
import { Badge, Button, LoadingSkeleton } from '@/components/ui'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import ApplicantAvatar from './ApplicantAvatar'
import { TERMINAL_STATUSES } from './atsConstants'
import { formatDate, formatDateTime } from './atsFormatters'

function InfoTile({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value || 'Not specified'}</p>
    </div>
  )
}

function SectionHeading({ icon: Icon, title }) {
  return (
    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-800">
      <Icon className="h-4 w-4 text-blue-600" /> {title}
    </h3>
  )
}

export default function ApplicantProfileModal({ 
  open, onClose, application, detail, loading, jobTitle, 
  onScheduleInterview, onHire, onReject, onShortlist 
}) {
  const data = detail || application
  const seeker = data?.seeker || {}
  const status = data?.status
  const skills = seeker.skills || []
  const timeline = data?.timeline || []
  const educations = seeker.educations || []
  const workExperiences = seeker.work_experiences || []

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      {/* 
        Slide-over Panel Styling:
        Instead of a centered modal, we make the DialogContent stick to the right edge.
        We explicitly override the centering and zoom animations of the default DialogContent.
      */}
      <DialogContent className="fixed left-auto right-0 top-0 bottom-0 z-50 h-full w-full max-w-none translate-x-0 translate-y-0 sm:w-[500px] lg:w-[700px] xl:w-[800px] overflow-hidden p-0 gap-0 border-l bg-slate-50 shadow-2xl duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full rounded-none sm:rounded-none">
        
        {/* Sticky Header with Actions */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ApplicantAvatar applicationId={data?.apply_id} hasPhoto={seeker.has_profile_image} name={seeker.name} size="md" />
              <div>
                <DialogTitle className="text-xl font-black text-slate-900">{seeker.name || 'Applicant'}</DialogTitle>
                <p className="text-sm font-medium text-slate-500">Applying for: <span className="text-blue-700">{jobTitle || data?.job?.job_title}</span></p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!loading && !TERMINAL_STATUSES.includes(status) && (
                <>
                  {status === 'pending' && <Button variant="outline" size="sm" onClick={() => onShortlist(data)}>Shortlist</Button>}
                  <Button variant="outline" size="sm" onClick={() => onScheduleInterview(data)}>Interview</Button>
                  <Button variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => onHire(data)}>Hire</Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => onReject(data)}>Reject</Button>
                </>
              )}
              <div className="mx-2 h-6 w-px bg-slate-200"></div>
              <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"><X className="h-5 w-5" /></button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="h-full overflow-y-auto pb-24">
          <div className="flex items-start gap-3 border-b border-amber-100 bg-amber-50 px-6 py-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
            <p className="text-xs leading-relaxed text-amber-800">
              <strong className="font-semibold">Official HR Onboarding Data:</strong> Demographic data is revealed in
              compliance with R.A. 10911. Evaluate candidates strictly on merit and match score before viewing these details.
            </p>
          </div>

          <div className="p-6 lg:p-8 space-y-8">
            {loading ? (
              <div className="space-y-4">
                <LoadingSkeleton variant="text" rows={2} className="max-w-xs" />
                <LoadingSkeleton variant="card" rows={3} />
              </div>
            ) : (
              <>
                {/* Status & Match Badge */}
                <div className="flex flex-wrap items-center gap-2">
                  {status && <Badge status={status}>{data?.status_label || status}</Badge>}
                  <Badge variant="neutral" icon={false}>{Math.round(Number(data?.match_percentage ?? 0))}% match</Badge>
                </div>

                {/* Grid Overview */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <SectionHeading icon={Mail} title="Contact & Summary" />
                    <div className="flex items-center gap-3 text-sm text-slate-700"><Mail className="h-4 w-4 text-slate-400" /> {seeker.email || 'Not provided'}</div>
                    <div className="flex items-center gap-3 text-sm text-slate-700"><Phone className="h-4 w-4 text-slate-400" /> {seeker.mobile_number || 'Not provided'}</div>
                    <div className="flex items-center gap-3 text-sm text-slate-700"><MapPin className="h-4 w-4 text-slate-400" /> {seeker.address || 'Not provided'}</div>
                    <div className="pt-2"><InfoTile label="Applied on" value={formatDate(data?.applied_at)} /></div>
                  </div>

                  <div>
                    <SectionHeading icon={Sparkles} title="Matched Skills" />
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill, index) => (
                        <span key={`${skill}-${index}`} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">{skill}</span>
                      ))}
                      {!skills.length && <span className="text-sm text-slate-500">No declared skills yet.</span>}
                    </div>
                  </div>
                </div>

                <hr className="border-slate-200" />

                {/* Full Web Resume: Work Experience */}
                <div>
                  <SectionHeading icon={Briefcase} title="Work Experience" />
                  {workExperiences.length > 0 ? (
                    <div className="space-y-6">
                      {workExperiences.map((xp, index) => (
                        <div key={index} className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-[-24px] before:w-px before:bg-slate-200 last:before:hidden">
                          <div className="absolute left-1 top-1.5 h-2 w-2 rounded-full bg-blue-500 ring-4 ring-white" />
                          <h4 className="text-base font-bold text-slate-900">{xp.position}</h4>
                          <p className="text-sm font-semibold text-slate-700">{xp.company_name}</p>
                          <p className="text-xs text-slate-500 mb-2">
                            {formatDate(xp.start_date)} - {xp.is_current ? 'Present' : formatDate(xp.end_date)}
                          </p>
                          {xp.description && <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{xp.description}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                      No work experience provided.
                    </div>
                  )}
                </div>

                {/* Full Web Resume: Education */}
                <div>
                  <SectionHeading icon={GraduationCap} title="Education" />
                  {educations.length > 0 ? (
                    <div className="space-y-6">
                      {educations.map((edu, index) => (
                        <div key={index} className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-[-24px] before:w-px before:bg-slate-200 last:before:hidden">
                          <div className="absolute left-1 top-1.5 h-2 w-2 rounded-full bg-blue-500 ring-4 ring-white" />
                          <h4 className="text-base font-bold text-slate-900">{edu.course || edu.education_level}</h4>
                          <p className="text-sm font-semibold text-slate-700">{edu.school_name}</p>
                          <p className="text-xs text-slate-500">
                            {formatDate(edu.start_date)} - {edu.is_current ? 'Present' : formatDate(edu.end_date)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                      No education history provided.
                    </div>
                  )}
                </div>

                <hr className="border-slate-200" />

                {/* Interview & Remarks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <SectionHeading icon={Building} title="Interview & Outcome" />
                    <div className="space-y-3 text-sm text-slate-600">
                      {data?.interview ? (
                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-blue-900 shadow-sm">
                          <p className="font-black text-base">Interview scheduled</p>
                          <p className="mt-1 font-medium">{formatDateTime(data.interview.schedule)}</p>
                          <p className="mt-2 text-blue-800">{data.interview.venue_or_link || 'Venue to follow'}</p>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">No interview scheduled yet.</div>
                      )}
                      <InfoTile label="Employer remarks" value={data?.employer_remarks} />
                    </div>
                  </div>

                  <div>
                    <SectionHeading icon={FileText} title="Application Timeline" />
                    <div className="space-y-4">
                      {timeline.length ? timeline.map((item, index) => (
                        <div key={`${item.title}-${index}`} className="flex gap-3">
                          <div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.status === status ? 'bg-blue-600 ring-4 ring-blue-50' : 'bg-slate-300'}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900">{item.title}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.timestamp ? formatDateTime(item.timestamp) : 'Pending'}</p>
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No timeline entries yet.</div>
                      )}
                    </div>
                  </div>
                </div>

              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
