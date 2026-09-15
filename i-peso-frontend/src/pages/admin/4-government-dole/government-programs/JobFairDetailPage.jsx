import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ClipboardEdit, Download, Eye, FileText, Flame, Mail, RefreshCw, Save, Search, ShieldCheck, TrendingUp, UserCheck, Users, XCircle } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Card, CardHeader, LoadingSkeleton, StatCard } from '@/components/ui'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import PageHeader from '@/pages/admin/_components/PageHeader'
import LocationPreviewCard from '@/components/maps/LocationPreviewCard'
import EstablishmentReportPreview from '@/components/reports/EstablishmentReportPreview'
import ConfirmationSlipPreview from '@/components/reports/ConfirmationSlipPreview'
import { adminService } from '@/services/adminService'
import { Command } from 'cmdk'
import JobFairEmployersTable from './components/JobFairEmployersTable'
import JobFairReportsChart from './components/JobFairReportsChart'
// Every possible participation_status value, grouped only to color the
// read-only status Badge — most of these are computed automatically
// (invited/interested/accepted/declined/requirements_pending/
// requirements_submitted/approved/encoded_results/report_generated), not
// admin picks. See MANUAL_STATUS_ACTIONS below for the ones that still are.
const statusGroups = [
  { label: 'Pending', tone: 'pending', statuses: ['invited', 'interested', 'called_peso', 'pending_response', 'requirements_pending'] },
  { label: 'In review', tone: 'review', statuses: ['accepted', 'under_review', 'requirements_submitted'] },
  { label: 'Approved', tone: 'approved', statuses: ['approved', 'attended', 'encoded_results', 'report_generated'] },
  { label: 'Rejected', tone: 'rejected', statuses: ['declined', 'rejected', 'no_show'] },
]
const statusTones = Object.fromEntries(statusGroups.flatMap((g) => g.statuses.map((s) => [s, g.tone])))



const inputClass = 'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/10'

function StepLabel({ step, children }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-black text-white">{step}</span>
      {children}
    </span>
  )
}

function Field({ label, value, onChange, type = 'text', textarea = false, className = '' }) {
  return (
    <label className={`text-xs font-bold uppercase tracking-wide text-slate-500 ${className}`}>
      {label}
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className={`resize-none normal-case ${inputClass}`} />
      ) : (
        <input type={type} min={type === 'number' ? 0 : undefined} value={value} onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)} className={`normal-case ${inputClass}`} />
      )}
    </label>
  )
}

export default function JobFairDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [fair, setFair] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewingReport, setViewingReport] = useState(null)
  const [reviewingParticipantId, setReviewingParticipantId] = useState(null)
  const [viewingConfirmationSlip, setViewingConfirmationSlip] = useState(null)

  // Search-as-you-type employer picker for "Invite" — replaces a bare
  // numeric employer-ID text box with something an admin can actually use
  // without already knowing an ID number.
  const [employerQuery, setEmployerQuery] = useState('')
  const [employerResults, setEmployerResults] = useState([])
  const [employerSearching, setEmployerSearching] = useState(false)
  const [employerPickerOpen, setEmployerPickerOpen] = useState(false)
  const employerPickerRef = useRef(null)

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) { setLoading(true); setError('') }
    try {
      setFair(await adminService.getJobFairDetail(id))
    } catch (e) {
      if (!silent) setError(e.response?.data?.message ?? 'Unable to load event.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [id])
  useEffect(() => { load() }, [load])

  // Keeps the metrics grid current while staff are checking people in from a
  // separate phone at the venue — a plain poll rather than a websocket push,
  // since this project has no Reverb server actually running anywhere.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load({ silent: true })
    }, 8000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    if (!employerQuery.trim()) { setEmployerResults([]); return }
    const timeout = setTimeout(async () => {
      setEmployerSearching(true)
      try {
        const data = await adminService.getEmployers({ search: employerQuery.trim(), verification_status: 'verified', per_page: 8 })
        setEmployerResults(data.data ?? [])
      } catch {
        setEmployerResults([])
      } finally {
        setEmployerSearching(false)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [employerQuery])

  useEffect(() => {
    const onClickAway = (event) => {
      if (employerPickerRef.current && !employerPickerRef.current.contains(event.target)) setEmployerPickerOpen(false)
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [])

  const metrics = fair?.metrics ?? {}
  const reports = useMemo(() => fair?.result_reports ?? [], [fair])
  const unifiedTotals = useMemo(() => reports.reduce((sum, r) => ({
    total_male: sum.total_male + (r.total_male ?? 0),
    total_female: sum.total_female + (r.total_female ?? 0),
    total_applicants: sum.total_applicants + (r.total_applicants ?? 0),
    total_qualified: sum.total_qualified + (r.total_qualified ?? 0),
    total_hots: sum.total_hots + (r.total_hots ?? 0),
    total_near_hired: sum.total_near_hired + (r.total_near_hired ?? 0),
    total_rejected: sum.total_rejected + (r.total_rejected ?? 0),
    total_vacancies_solicited: sum.total_vacancies_solicited + (r.total_vacancies_solicited ?? 0),
    total_vacancies_offered: sum.total_vacancies_offered + (r.total_vacancies_offered ?? 0),
  }), { total_male: 0, total_female: 0, total_applicants: 0, total_qualified: 0, total_hots: 0, total_near_hired: 0, total_rejected: 0, total_vacancies_solicited: 0, total_vacancies_offered: 0 }), [reports])

  // Derived live from `fair` (not a snapshot) so approving/rejecting a
  // requirement — which triggers load() — updates the open dialog instead of
  // leaving it showing stale status.
  const reviewingParticipant = fair?.participants?.find((p) => p.id === reviewingParticipantId) ?? null

  const action = async (work, success) => {
    try {
      await work()
      toast.success(success)
      await load()
    } catch (e) {
      toast.error(Object.values(e.response?.data?.errors ?? {}).flat().join(' ') || e.response?.data?.message || 'Action failed.')
    }
  }

  const blobDownload = async (work, filename) => {
    try {
      const blob = await work()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url; link.download = filename; link.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Download failed.')
    }
  }

  const blobPreview = async (work) => {
    try {
      const blob = await work()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Preview failed.')
    }
  }

  const inviteEmployer = (employer) => {
    setEmployerPickerOpen(false)
    setEmployerQuery('')
    setEmployerResults([])
    action(() => adminService.inviteJobFairEmployer(id, { employer_id: employer.employer_id }), `${employer.company_name} invited.`)
  }

  if (loading && !fair) {
    return (
      <div className="portal-page">
        <LoadingSkeleton variant="text" rows={2} className="max-w-md" />
        <LoadingSkeleton variant="stat" rows={4} />
        <LoadingSkeleton variant="card" rows={2} />
      </div>
    )
  }

  const statCards = [
    { label: 'Approved Employers', value: metrics.approved, icon: CheckCircle2, color: 'green' },
    { label: 'Total Applicants', value: metrics.total_applicants, icon: Users, color: 'blue' },
    { label: 'Hired on the Spot', value: metrics.total_hots, icon: Flame, color: 'amber' },
    { label: 'Near Hired', value: metrics.total_near_hired, icon: TrendingUp, color: 'blue' },
  ]

  return (
    <div className="portal-page">
      <PageHeader
        title={fair?.title ?? 'Job Fair'}
        subtitle="Pre-event coordination and post-event omnichannel reporting."
        eyebrow="Zero-Interference Job Fair"
        actions={[
          { label: 'Back', onClick: () => navigate('/admin/job-fairs'), variant: 'secondary' },
          { label: 'Edit', onClick: () => navigate(`/admin/job-fairs/${id}/edit`), variant: 'secondary' },
          { label: 'Check-In', onClick: () => navigate(`/admin/job-fairs/${id}/check-in`) },
        ]}
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employers">Employers{fair?.participants?.length ? ` (${fair.participants.length})` : ''}</TabsTrigger>
          <TabsTrigger value="reports">Reports{reports.length ? ` (${reports.length})` : ''}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
            
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {statCards.map((card) => (
                <StatCard key={card.label} label={card.label} value={card.value} icon={card.icon} tone={card.color} />
              ))}
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900 shadow-sm">
              <strong>Physical event status quo:</strong> i-PESO does not force digital crowd control at the venue — employers use their normal tables and paper resumes; the system focuses on coordination before the event and report automation afterward.
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader title="Announcement & invitation" subtitle={`${fair?.status?.replaceAll('_', ' ') ?? ''} · ${fair?.venue ?? ''}`} />
              <div className="flex flex-wrap gap-2">
                <Button icon={ShieldCheck} onClick={() => action(() => adminService.publishJobFair(id, 'accepting_employers'), 'Announcement published and accepting employers.')}>
                  Publish
                </Button>
                <Button variant="outline" icon={FileText} onClick={() => blobDownload(() => adminService.downloadJobFairInvitation(id), `job-fair-invitation-${id}.pdf`)}>
                  Invitation PDF
                </Button>
              </div>

              <div ref={employerPickerRef} className="relative mt-5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5 block">Invite a verified employer</label>
                <Command className="rounded-xl border border-slate-300 shadow-sm overflow-visible bg-white" shouldFilter={false}>
                  <Command.Input
                    value={employerQuery}
                    onValueChange={(val) => { setEmployerQuery(val); setEmployerPickerOpen(true) }}
                    onFocus={() => setEmployerPickerOpen(true)}
                    placeholder="Search company name…"
                    className="w-full border-none bg-transparent px-4 py-2.5 text-sm focus:outline-none focus:ring-0"
                  />
                  <AnimatePresence>
                    {employerPickerOpen && employerQuery.trim() && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-10 w-full top-full mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                      >
                        <Command.List className="max-h-64 overflow-y-auto p-1">
                          {employerSearching ? (
                            <Command.Loading className="px-4 py-3 text-xs font-semibold text-slate-500">Searching…</Command.Loading>
                          ) : employerResults.length === 0 ? (
                            <Command.Empty className="px-4 py-3 text-xs font-semibold text-slate-500">No verified employer matches.</Command.Empty>
                          ) : (
                            employerResults.map((employer) => (
                              <Command.Item
                                key={employer.employer_id}
                                onSelect={() => inviteEmployer(employer)}
                                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-700"
                              >
                                <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                                <span className="truncate font-bold text-slate-900">{employer.company_name}</span>
                              </Command.Item>
                            ))
                          )}
                        </Command.List>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Command>
              </div>

              {fair?.latitude && fair?.longitude && (
                <div className="mt-5">
                  <LocationPreviewCard title="Venue Pin" fullAddress={fair.full_address || fair.venue} latitude={fair.latitude} longitude={fair.longitude} isAdmin verified={Boolean(fair.google_place_id)} />
                </div>
              )}
            </Card>
          </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="employers">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Employers electronically confirm their attendance and report results.</p>
              <Button variant="outline" icon={RefreshCw} onClick={load} className="shadow-sm">Refresh</Button>
            </div>

            <JobFairEmployersTable 
              participants={(fair?.participants ?? []).map(p => ({
                ...p, 
                total_requirements: (fair?.requirements ?? []).length
              }))}
              onReviewRequirements={setReviewingParticipantId}
              statusTones={statusTones}
            />
          </motion.div>
        </TabsContent>



        <TabsContent value="reports">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
          {reports.length > 0 && (
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Establishments reported" value={reports.length} icon={FileText} color="blue" />
              <StatCard label="Total applicants" value={unifiedTotals.total_applicants} icon={Users} color="blue" />
              <StatCard label="Hired on the spot" value={unifiedTotals.total_hots} icon={Flame} color="amber" />
              <StatCard label="Mismatched" value={unifiedTotals.total_rejected} icon={XCircle} color="red" />
            </section>
          )}

          <Card padding="sm" className="mb-6 flex flex-wrap items-center justify-between gap-4 border-emerald-100 bg-emerald-50/30">
            <div>
              <p className="font-black text-emerald-950">Job Seeker Attendance Report</p>
              <p className="text-xs font-semibold text-emerald-700/80">List of seekers who checked in at the info desk</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" icon={Download} onClick={() => blobDownload(() => adminService.downloadJobFairAttendancePdf(id), `job-fair-attendance-${id}.pdf`)}>Download PDF</Button>
              <Button size="sm" variant="outline" icon={Download} onClick={() => blobDownload(() => adminService.downloadJobFairAttendanceExcel(id), `job-fair-attendance-${id}.csv`)}>Download Excel</Button>
            </div>
          </Card>

          <JobFairReportsChart metrics={metrics} reports={reports} />

          <Card padding="none">
            <div className="border-b border-slate-100 p-5">
              <CardHeader title="Merged post-event reports" subtitle="Self-service encoded records." />
            </div>
            <div className="divide-y divide-slate-100">
              {reports.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-500">No post-event reports yet.</p>
              ) : reports.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-bold text-slate-900">{r.company_name}</p>
                    <p className="text-xs font-semibold text-slate-500">{r.total_applicants} applicants · {r.total_hots} HOTS</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" icon={Eye} onClick={() => setViewingReport(r)}>
                      View
                    </Button>
                    <Button size="sm" variant="outline" icon={Download} onClick={() => blobDownload(() => adminService.downloadJobFairResult(r.id), `ro1-jf-form-3-${r.id}.pdf`)}>
                      RO1-JF Form 3
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(viewingReport)} onOpenChange={(open) => !open && setViewingReport(null)}>
        <DialogContent className="max-w-7xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingReport?.company_name} — RO1-JF Form 3</DialogTitle>
          </DialogHeader>
          <EstablishmentReportPreview report={viewingReport} jobFair={fair} />
          {viewingReport && (
            <Button variant="outline" icon={Download} onClick={() => blobDownload(() => adminService.downloadJobFairResult(viewingReport.id), `ro1-jf-form-3-${viewingReport.id}.pdf`)}>
              Download PDF
            </Button>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(reviewingParticipant)} onOpenChange={(open) => !open && setReviewingParticipantId(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {reviewingParticipant && (
            <>
              <DialogHeader>
                <DialogTitle>{reviewingParticipant.company_name} — Requirements</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                {(fair.requirements ?? []).map((req) => {
                  const submitted = reviewingParticipant.requirements?.find((x) => x.job_fair_requirement_id === req.id)
                  const reused = Boolean(submitted?.reused_from_verification)
                  const autoSatisfied = Boolean(submitted?.auto_satisfied)
                  const hasViewableFile = submitted?.original_filename && !autoSatisfied && submitted.original_filename !== 'Digital confirmation slip'
                  const needsReview = submitted && submitted.status !== 'approved' && submitted.status !== 'rejected' && !autoSatisfied

                  return (
                    <div key={req.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-800">{req.label}</span>
                        <Badge variant={submitted ? (submitted.status === 'rejected' ? 'rejected' : submitted.status === 'approved' ? 'approved' : 'review') : 'neutral'} icon={false}>
                          {submitted?.status ?? 'not submitted'}
                        </Badge>
                      </div>

                      {autoSatisfied && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                          <ShieldCheck className="h-3.5 w-3.5" />Auto-verified from the employer's active job postings
                        </p>
                      )}
                      {reused && !autoSatisfied && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                          <ShieldCheck className="h-3.5 w-3.5" />Reused from a verified accreditation document
                        </p>
                      )}
                      {hasViewableFile && (
                        <button type="button" onClick={() => blobPreview(() => adminService.viewJobFairRequirement(submitted.id))} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline">
                          <FileText className="h-3.5 w-3.5" />View {submitted.original_filename}
                        </button>
                      )}
                      {submitted?.original_filename === 'Digital confirmation slip' && reviewingParticipant.confirmation_slip && (
                        <button type="button" onClick={() => setViewingConfirmationSlip(reviewingParticipant.confirmation_slip)} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-brand-navy hover:underline">
                          <FileText className="h-3.5 w-3.5" />View Confirmation Slip
                        </button>
                      )}
                      {submitted?.admin_remarks && <p className="mt-2 text-xs font-semibold text-rose-700">PESO note: {submitted.admin_remarks}</p>}

                      {needsReview && (
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="success" icon={CheckCircle2} onClick={() => action(() => adminService.reviewJobFairRequirement(submitted.id, { status: 'approved' }), 'Requirement approved.')}>
                            Approve
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => action(() => adminService.reviewJobFairRequirement(submitted.id, { status: 'rejected', admin_remarks: 'Please submit a clear and current document.' }), 'Requirement rejected with correction guidance.')}>
                            Reject
                          </Button>
                        </div>
                      )}
                      {!submitted && <p className="mt-2 text-xs font-semibold text-slate-400">Waiting on the employer.</p>}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(viewingConfirmationSlip)} onOpenChange={(open) => !open && setViewingConfirmationSlip(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirmation Slip — {viewingConfirmationSlip?.company_name}</DialogTitle>
          </DialogHeader>
          <ConfirmationSlipPreview slip={viewingConfirmationSlip} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
