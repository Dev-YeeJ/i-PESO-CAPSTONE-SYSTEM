import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, ClipboardList, FileText, FileUp, Mail, MapPin, Save, ShieldCheck } from 'lucide-react'
import { Badge, Button, Card, EmptyState, LoadingSkeleton } from '@/components/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ConfirmationSlipPreview from '@/components/reports/ConfirmationSlipPreview'
import ConfirmationVacancyEditor, { blankConfirmationVacancy, stripBlankConfirmationVacancies } from '@/components/reports/ConfirmationVacancyEditor'
import {
  expressJobFairInterest,
  listEmployerJobFairs,
  respondToJobFairInvitation,
  submitJobFairConfirmation,
  uploadJobFairRequirement,
  viewJobFairRequirement,
} from '@/services/jobFairService'
import { getProfile, getVacancies } from '@/services/employerService'

const blankConfirmation = {
  representative_1_name: '', representative_1_contact: '', representative_position: '',
  representative_2_name: '', representative_2_contact: '',
}

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/10'

const PARTICIPATION_BADGE = {
  invited: 'pending',
  interested: 'review',
  accepted: 'verified',
  declined: 'closed',
  requirements_pending: 'warning',
  requirements_submitted: 'review',
  under_review: 'review',
  approved: 'verified',
  rejected: 'rejected',
  attended: 'verified',
  no_show: 'closed',
  encoded_results: 'verified',
  report_generated: 'verified',
}

function FormField({ label, value, onChange, type = 'text', textarea = false, className = '' }) {
  return (
    <label className={`text-xs font-bold uppercase tracking-wide text-slate-500 ${className}`}>
      {label}
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className={`mt-1.5 resize-none normal-case ${inputClass}`} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={`mt-1.5 normal-case ${inputClass}`} />
      )}
    </label>
  )
}

function DetailChip({ icon: Icon, label, value, action }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
      <span className="mt-0.5 rounded-lg bg-white p-1.5 text-brand-navy shadow-sm">{Icon && <Icon className="h-4 w-4" />}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{value || 'Not specified'}</p>
        {action}
      </div>
    </div>
  )
}

const cardEntrance = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
}

function JobFairCard({ fair, onClick }) {
  const status = fair.participation?.status
  return (
    <Motion.button
      type="button"
      onClick={onClick}
      variants={cardEntrance}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="group flex h-full flex-col items-start gap-3 rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex w-full items-start justify-between gap-2">
        <h3 className="font-black tracking-tight text-slate-950">{fair.title}</h3>
        <Badge status={status ? (PARTICIPATION_BADGE[status] ?? 'neutral') : 'neutral'} className="shrink-0">{status ? status.replaceAll('_', ' ') : 'Not joined'}</Badge>
      </div>
      {fair.description && <p className="line-clamp-2 text-sm text-slate-500">{fair.description}</p>}
      <div className="mt-auto flex w-full flex-col gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />{fair.start_date} · {fair.start_time}–{fair.end_time}</span>
        <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{fair.venue}</span></span>
      </div>
      <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-brand-navy opacity-0 transition-opacity group-hover:opacity-100">
        View details <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Motion.button>
  )
}

// A real <button> that opens the hidden file input via a ref, instead of a
// <label> wrapping the input and relying on the browser's own "clicking a
// label activates its nested control" mechanism to open the file dialog.
// That label-based approach is what every requirement uploader on this page
// used to use; the same-shaped upload elsewhere in the app (document
// re-upload, registration) has always used this ref+button approach instead,
// and only that one has been confirmed working end to end.
function RequirementUploadButton({ isGallery, hasExisting, onSelect }) {
  const fileInputRef = useRef(null)
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple={isGallery}
        accept={isGallery ? undefined : '.pdf,.jpg,.jpeg,.png'}
        className="hidden"
        onChange={(e) => {
          const files = e.target.files
          if (files?.length) {
            onSelect(Array.from(files))
          }
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="mt-3 flex w-fit items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:border-brand-navy hover:text-brand-navy"
      >
        <FileUp className="h-4 w-4" />{isGallery ? (hasExisting ? 'Add another photo' : 'Upload photos') : 'Upload document'}
      </button>
    </>
  )
}

export default function EmployerJobFairDashboard() {
  const [fairs, setFairs] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [confirmation, setConfirmation] = useState(blankConfirmation)
  const [confirmationVacancies, setConfirmationVacancies] = useState([blankConfirmationVacancy()])
  const [myVacancies, setMyVacancies] = useState([])
  const [myProfile, setMyProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [justAccepted, setJustAccepted] = useState(false)
  const requirementsCardRef = useRef(null)


  const selected = useMemo(() => fairs.find((x) => String(x.job_fair_id) === String(selectedId)), [fairs, selectedId])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listEmployerJobFairs()
      setFairs(data)
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Unable to load Job Fairs.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    getVacancies({ per_page: 100 })
      .then((res) => setMyVacancies((res.data ?? []).filter((v) => v.status === 'active')))
      .catch(() => setMyVacancies([]))
    getProfile()
      .then((res) => setMyProfile(res.employer))
      .catch(() => setMyProfile(null))
  }, [])

  // Switching which fair is open discards any unsaved draft — each fair
  // gets its own confirmation form, not a shared one that leaks between events.
  useEffect(() => {
    setConfirmation(blankConfirmation)
    setConfirmationVacancies([blankConfirmationVacancy()])
  }, [selectedId])

  // Pre-fills Representative 1 from the account's own registered
  // representative — still freely editable, since a different staff member
  // may be the one actually attending this particular event.
  useEffect(() => {
    if (!myProfile) return
    setConfirmation((current) => (
      current.representative_1_name || current.representative_1_contact || current.representative_position
        ? current
        : {
            ...current,
            representative_1_name: myProfile.representative_name || '',
            representative_position: myProfile.representative_designation || '',
            representative_1_contact: myProfile.representative_contact_number || '',
          }
    ))
  }, [myProfile, selectedId])

  // A toast fires the instant it's called, so even a slow upload gets
  // immediate visible feedback ("Uploading…") instead of the page looking
  // like it did nothing while the request is in flight.
  const act = async (work, success, { loading } = {}) => {
    const toastId = loading ? toast.loading(loading) : null
    try {
      await work()
      toast.success(success, { id: toastId ?? undefined })
      await load()
    } catch (e) {
      const message = Object.values(e.response?.data?.errors ?? {}).flat().join(' ') || e.response?.data?.message || 'Action failed.'
      toast.error(message, { id: toastId ?? undefined })
    }
  }

  const acceptInvitation = async () => {
    try {
      const { participation } = await respondToJobFairInvitation(selected.job_fair_id, 'accepted')
      // Reflect the accepted/requirements status immediately from this
      // response instead of waiting on a full reload, then reconcile the
      // rest of the list (published vacancies, other participants, etc.)
      // in the background.
      setFairs((prev) => prev.map((fair) => (
        String(fair.job_fair_id) === String(selected.job_fair_id) ? { ...fair, participation } : fair
      )))
      toast.success('Invitation accepted.')
      if (participation?.status === 'requirements_pending') {
        setJustAccepted(true)
        requestAnimationFrame(() => {
          requirementsCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
        window.setTimeout(() => setJustAccepted(false), 2500)
      }
      load()
    } catch (e) {
      toast.error(Object.values(e.response?.data?.errors ?? {}).flat().join(' ') || e.response?.data?.message || 'Action failed.')
    }
  }

  const viewSubmission = async (submission) => {
    try {
      const blob = await viewJobFairRequirement(submission.id)
      window.open(URL.createObjectURL(blob), '_blank')
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Unable to open this document.')
    }
  }

  const requirementsProgress = useMemo(() => {
    const total = selected?.requirements?.length ?? 0
    const done = total ? selected.requirements.filter((req) => {
      const submitted = selected.participation?.requirements?.find((x) => x.job_fair_requirement_id === req.id)
      return submitted && submitted.status !== 'rejected'
    }).length : 0
    return { total, done }
  }, [selected])
  const requirementsDone = requirementsProgress.total > 0 && requirementsProgress.done === requirementsProgress.total

  const confirmationRequirement = selected?.requirements?.find((req) => req.code === 'confirmation_slip')
  const confirmationDone = Boolean(selected?.participation?.confirmation_slip?.id)
  const readyForEstablishmentReport = ['approved', 'attended', 'encoded_results', 'report_generated']
    .includes(selected?.participation?.status)

  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 px-8 py-8 text-white shadow-xl sm:px-12 sm:py-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl"></div>
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-300">PESO Job Fairs</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white drop-shadow-sm">Job Fair Coordination</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-blue-100">
            Submit requirements, confirm attendance, and encode results for each job fair you join.
          </p>
        </div>
      </div>


      {loading ? (
        <LoadingSkeleton variant="card" rows={2} />
      ) : !fairs.length ? (
        <Card><EmptyState icon={CalendarDays} title="No job fairs announced yet" description="Published PESO job fair announcements will appear here." /></Card>
      ) : !selected ? (
        <div>
          <h2 className="text-base font-extrabold text-slate-950">All Job Fairs</h2>
          <p className="mt-1 text-sm text-slate-500">Select an event to view its coordination record.</p>
          <Motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.06 } } }}
            className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {fairs.map((fair) => (
              <JobFairCard key={fair.job_fair_id} fair={fair} onClick={() => setSelectedId(String(fair.job_fair_id))} />
            ))}
          </Motion.div>
        </div>
      ) : (
        <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }} className="space-y-5">
          <button type="button" onClick={() => setSelectedId('')} className="flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" />
            Back to all Job Fairs
          </button>

          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-2xl font-black text-slate-950">{selected.title}</h2>
                {selected.description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{selected.description}</p>}
              </div>
              {selected.participation?.status && (
                <Badge status={PARTICIPATION_BADGE[selected.participation.status] ?? 'neutral'} className="shrink-0">{selected.participation.status.replaceAll('_', ' ')}</Badge>
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <DetailChip icon={CalendarDays} label="Date & time" value={`${selected.start_date} · ${selected.start_time}–${selected.end_time}`} />
              <DetailChip
                icon={MapPin}
                label="Venue"
                value={selected.venue}
                action={selected.latitude && selected.longitude ? (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${selected.latitude},${selected.longitude}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-bold text-brand-navy hover:underline">
                    Get Directions
                  </a>
                ) : null}
              />
              <DetailChip icon={Mail} label="PESO contact" value={selected.contact_email} />
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
              {!selected.participation && (
                <Button onClick={() => act(() => expressJobFairInterest(selected.job_fair_id), 'Successfully joined the Job Fair.')}>Join Job Fair</Button>
              )}
              {selected.participation?.status === 'invited' && (
                <>
                  <Button onClick={acceptInvitation}>Accept Invitation</Button>
                  <Button variant="outline" onClick={() => act(() => respondToJobFairInvitation(selected.job_fair_id, 'declined'), 'Invitation declined.')}>Decline</Button>
                </>
              )}
              <a href={`mailto:${selected.contact_email ?? ''}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Contact PESO</a>
            </div>
          </Card>

          {selected.participation && (
            <div
              ref={requirementsCardRef}
              className={`rounded-xl transition-shadow ${justAccepted ? 'ring-2 ring-emerald-400 ring-offset-2' : ''}`}
            >
              <Card padding="none">
                <div className="border-b border-slate-100 p-5 pb-0">
                  <Tabs defaultValue="requirements">
                  <TabsList>
                    <TabsTrigger value="requirements">
                      1. Requirements {requirementsDone && <CheckCircle2 className="ml-1 inline h-3.5 w-3.5 text-emerald-600" />}
                    </TabsTrigger>
                    <TabsTrigger value="confirmation">
                      2. Confirmation Slip {confirmationDone && <CheckCircle2 className="ml-1 inline h-3.5 w-3.5 text-emerald-600" />}
                    </TabsTrigger>
                  </TabsList>

                  <div className="pb-6">
                    <TabsContent value="requirements">
                      <Motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-slate-500">Participation status: <span className="font-bold capitalize text-slate-800">{selected.participation.status.replaceAll('_', ' ')}</span></p>
                        {requirementsProgress.total > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                              <Motion.div
                                className={`h-full rounded-full ${requirementsDone ? 'bg-emerald-500' : 'bg-brand-navy'}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${(requirementsProgress.done / requirementsProgress.total) * 100}%` }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-500">{requirementsProgress.done}/{requirementsProgress.total} ready</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        {selected.requirements.map((req) => {
                          const submissions = selected.participation.requirements?.filter((x) => x.job_fair_requirement_id === req.id) || []
                          const reused = submissions.some((s) => s.reused_from_verification)
                          const autoSatisfied = submissions.some((s) => s.auto_satisfied)
                          const isGallery = req.code === 'posterized_vacancy'
                          const nonRejected = submissions.filter((s) => s.status !== 'rejected')
                          const isRejected = submissions.length > 0 && submissions.every((s) => s.status === 'rejected')
                          // Posterized Job Vacancy can hold up to 5 photos, so the
                          // uploader stays available (to add more) as long as
                          // there's room — every other requirement is a single
                          // document, hidden again once one is on file.
                          const isApproved = ['approved', 'requirements_approved', 'attended'].includes(selected.participation.status)
                          const canUpload = !isApproved && req.code !== 'confirmation_slip' && !reused && !autoSatisfied
                            && (isGallery ? nonRejected.length < 5 : (!submissions.length || isRejected))
                          const status = submissions.length > 0 ? submissions[0].status : 'pending'

                          return (
                            <div key={req.id} className="rounded-xl border border-slate-200 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-sm font-bold text-slate-800">{req.label}</span>
                                {isGallery ? (
                                  <Badge variant={nonRejected.length > 0 ? 'approved' : 'neutral'} icon={false}>
                                    {nonRejected.length > 0 ? `${nonRejected.length} photo${nonRejected.length === 1 ? '' : 's'} uploaded` : 'No photos yet'}
                                  </Badge>
                                ) : (
                                  <Badge variant={submissions.length > 0 ? (status === 'rejected' ? 'rejected' : 'approved') : 'neutral'} icon={false}>
                                    {status}
                                  </Badge>
                                )}
                              </div>

                              {autoSatisfied && (
                                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                  <ShieldCheck className="h-3.5 w-3.5" />Verified from your active job postings — nothing to upload
                                </p>
                              )}

                              {submissions.map((sub) => (
                                sub.original_filename && !autoSatisfied && sub.original_filename !== 'Digital confirmation slip' && (
                                  <button key={sub.id} type="button" onClick={() => viewSubmission(sub)} className="mt-2 flex w-full items-center gap-1.5 text-xs font-semibold text-brand-navy hover:underline">
                                    <FileText className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{reused ? `Already verified — ${sub.original_filename}` : sub.original_filename}</span>
                                  </button>
                                )
                              ))}

                              {canUpload && (
                                <RequirementUploadButton
                                  isGallery={isGallery}
                                  hasExisting={nonRejected.length > 0}
                                  onSelect={(files) => {
                                    act(() => uploadJobFairRequirement(selected.job_fair_id, req.id, files), `${req.label} submitted.`, { loading: `Uploading ${files.length > 1 ? `${files.length} photos` : files[0].name}…` })
                                  }}
                                />
                              )}
                              {submissions[0]?.admin_remarks && <p className="mt-2 text-xs font-semibold text-rose-700">PESO: {submissions[0].admin_remarks}</p>}
                            </div>
                          )
                        })}
                      </div>
                      </Motion.div>
                    </TabsContent>

                    <TabsContent value="confirmation">
                      <Motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                        {confirmationDone ? (
                          <div className="space-y-6">
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                              <div className="flex items-center gap-3">
                                <span className="rounded-lg bg-white p-2 text-emerald-700 shadow-sm"><CheckCircle2 className="h-4 w-4" /></span>
                                <div>
                                  <p className="text-sm font-bold text-emerald-900">Confirmation Slip Submitted</p>
                                  <p className="text-xs text-emerald-700">You have already submitted your confirmation for this Job Fair.</p>
                                </div>
                              </div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                              <ConfirmationSlipPreview slip={selected.participation?.confirmation_slip} />
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="mb-4 text-sm text-slate-500">Maximum {selected.maximum_representatives} representative(s) for this event.</p>
                            <div className="space-y-4">
                              <div className="rounded-xl border border-slate-200 p-4">
                                <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-slate-600">Representative 1</p>
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <FormField label="Full name" value={confirmation.representative_1_name} onChange={(v) => setConfirmation((x) => ({ ...x, representative_1_name: v }))} />
                                  <FormField label="Position/s" value={confirmation.representative_position} onChange={(v) => setConfirmation((x) => ({ ...x, representative_position: v }))} />
                                  <FormField label="Contact number" value={confirmation.representative_1_contact} onChange={(v) => setConfirmation((x) => ({ ...x, representative_1_contact: v }))} />
                                </div>
                              </div>
                              <div className="rounded-xl border border-slate-200 p-4">
                                <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-slate-600">Representative 2 <span className="font-normal normal-case text-slate-400">(optional)</span></p>
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <FormField label="Full name" value={confirmation.representative_2_name} onChange={(v) => setConfirmation((x) => ({ ...x, representative_2_name: v }))} />
                                  <FormField label="Contact number" value={confirmation.representative_2_contact} onChange={(v) => setConfirmation((x) => ({ ...x, representative_2_contact: v }))} />
                                </div>
                              </div>
                            </div>
                            <div className="mt-6">
                              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">List of Vacancies / Orders</p>
                              <ConfirmationVacancyEditor vacancies={confirmationVacancies} onChange={setConfirmationVacancies} myVacancies={myVacancies} />
                            </div>
                            <Button
                              className="mt-5"
                              icon={Save}
                              onClick={() => act(() => submitJobFairConfirmation(selected.job_fair_id, {
                                ...confirmation, vacancies: stripBlankConfirmationVacancies(confirmationVacancies),
                              }), 'Confirmation slip submitted.')}
                            >
                              Submit Confirmation
                            </Button>
                          </>
                        )}
                      </Motion.div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </Card>

            {readyForEstablishmentReport && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-white p-2 text-emerald-700 shadow-sm"><ClipboardList className="h-4 w-4" /></span>
                  <div>
                    <p className="text-sm font-bold text-emerald-900">Ready to report your results?</p>
                    <p className="text-xs text-emerald-700">Submit this event&apos;s Establishment Report (RO1-JF Form 3) from the Establishment Report page.</p>
                  </div>
                </div>
                <Button to="/employer/reports/establishment-report" variant="navy">Go to Establishment Report</Button>
              </div>
            )}
            </div>
          )}
        </Motion.div>
      )}
    </div>
  )
}
