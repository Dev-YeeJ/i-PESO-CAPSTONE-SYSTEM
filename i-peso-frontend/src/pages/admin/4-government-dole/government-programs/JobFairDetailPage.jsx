import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, ClipboardEdit, Download, Eye, FileText, Flame, Mail, RefreshCw, Save, Search, ShieldCheck, TrendingUp, UserCheck, Users, XCircle } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertBox, Badge, Button, Card, CardHeader, LoadingSkeleton, StatCard } from '@/components/ui'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectGroup, SelectLabel, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import PageHeader from '@/pages/admin/_components/PageHeader'
import LocationPreviewCard from '@/components/maps/LocationPreviewCard'
import EstablishmentReportPreview from '@/components/reports/EstablishmentReportPreview'
import JobFairResultEntryEditor from '@/components/reports/JobFairResultEntryEditor'
import ConfirmationVacancyEditor, { blankConfirmationVacancy, stripBlankConfirmationVacancies } from '@/components/reports/ConfirmationVacancyEditor'
import { adminService } from '@/services/adminService'

// Grouped by the same tone used for the status Badge, so the grouping in the
// dropdown and the color once selected always agree.
const statusGroups = [
  { label: 'Pending', tone: 'pending', statuses: ['invited', 'interested', 'called_peso', 'pending_response', 'requirements_pending'] },
  { label: 'In review', tone: 'review', statuses: ['accepted', 'under_review', 'requirements_submitted'] },
  { label: 'Approved', tone: 'approved', statuses: ['approved', 'attended', 'encoded_results', 'report_generated'] },
  { label: 'Rejected', tone: 'rejected', statuses: ['declined', 'rejected', 'no_show'] },
]
const statusTones = Object.fromEntries(statusGroups.flatMap((g) => g.statuses.map((s) => [s, g.tone])))

// Matches StatCard's own color token names, resized for a compact inline swatch.
const statTone = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
}

const zeroProxy = { company_name: '', employer_type: 'paper_only_employer', contact_person: '', contact_number: '', clearance_no: '', total_male: 0, total_female: 0, total_applicants: 0, total_qualified: 0, total_hots: 0, total_near_hired: 0, total_rejected: 0, total_vacancies_solicited: 0, total_vacancies_offered: 0, remarks: '' }
const zeroProxyConfirmation = { company_name: '', representative_1_name: '', representative_1_contact: '', email: '', will_conduct_onsite_interview: false, logistics_requests: '' }
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
  const [notice, setNotice] = useState('')
  const [proxy, setProxy] = useState(zeroProxy)
  const [proxyEntries, setProxyEntries] = useState([])
  const [proxyConfirmation, setProxyConfirmation] = useState(zeroProxyConfirmation)
  const [proxyConfirmationVacancies, setProxyConfirmationVacancies] = useState([blankConfirmationVacancy()])
  const [viewingReport, setViewingReport] = useState(null)
  const [reviewingParticipantId, setReviewingParticipantId] = useState(null)

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
    setError(''); setNotice('')
    try {
      await work()
      setNotice(success)
      await load()
    } catch (e) {
      setError(Object.values(e.response?.data?.errors ?? {}).flat().join(' ') || e.response?.data?.message || 'Action failed.')
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
      setError(e.response?.data?.message ?? 'Download failed.')
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
    { label: 'Approved', value: metrics.approved, icon: CheckCircle2, color: 'green' },
    { label: 'Attended', value: metrics.attended, icon: UserCheck, color: 'blue' },
    { label: 'Self-service reports', value: metrics.self_service_reports, icon: FileText, color: 'blue' },
    { label: 'Admin proxy reports', value: metrics.proxy_reports, icon: ClipboardEdit, color: 'amber' },
    { label: 'Applicants', value: metrics.total_applicants, icon: Users, color: 'blue' },
    { label: 'Hired on the spot', value: metrics.total_hots, icon: Flame, color: 'amber' },
    { label: 'Near hired', value: metrics.total_near_hired, icon: TrendingUp, color: 'blue' },
    { label: 'Rejected', value: metrics.total_rejected, icon: XCircle, color: 'red' },
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

      {error && <AlertBox variant="danger" title="Action failed">{error}</AlertBox>}
      {notice && <AlertBox variant="success" title="Saved">{notice}</AlertBox>}

      {/* Always-visible KPI strip — sticks below the app header while scrolling
          any tab, so the admin never has to hop back to Overview to see it. */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap gap-x-6 gap-y-2.5">
          {statCards.map((card) => (
            <div key={card.label} className="flex items-center gap-2">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${statTone[card.color] ?? statTone.blue}`}>
                <card.icon className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-sm font-black leading-none text-slate-900">{card.value ?? 0}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{card.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employers">Employers{fair?.participants?.length ? ` (${fair.participants.length})` : ''}</TabsTrigger>
          <TabsTrigger value="paper">Paper encoding</TabsTrigger>
          <TabsTrigger value="reports">Reports{reports.length ? ` (${reports.length})` : ''}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
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
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Invite a verified employer</label>
                <div className="relative mt-1.5">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={employerQuery}
                    onChange={(e) => { setEmployerQuery(e.target.value); setEmployerPickerOpen(true) }}
                    onFocus={() => setEmployerPickerOpen(true)}
                    placeholder="Search company name…"
                    className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
                  />
                </div>
                {employerPickerOpen && employerQuery.trim() && (
                  <div className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-elevated">
                    {employerSearching ? (
                      <p className="px-3 py-2.5 text-xs text-slate-400">Searching…</p>
                    ) : employerResults.length === 0 ? (
                      <p className="px-3 py-2.5 text-xs text-slate-400">No verified employer matches.</p>
                    ) : (
                      <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
                        {employerResults.map((employer) => (
                          <li key={employer.employer_id}>
                            <button
                              type="button"
                              onClick={() => inviteEmployer(employer)}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50"
                            >
                              <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span className="truncate font-semibold text-slate-800">{employer.company_name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {fair?.latitude && fair?.longitude && (
                <div className="mt-5">
                  <LocationPreviewCard title="Venue Pin" fullAddress={fair.full_address || fair.venue} latitude={fair.latitude} longitude={fair.longitude} isAdmin verified={Boolean(fair.google_place_id)} />
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employers">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">Digital and manual confirmation channels are equally supported.</p>
            <Button variant="outline" icon={RefreshCw} onClick={load}>Refresh</Button>
          </div>

          {!(fair?.participants ?? []).length ? (
            <Card><p className="p-8 text-center text-sm text-slate-500">No employer participation records yet.</p></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {fair.participants.map((p) => {
                const totalReqs = (fair.requirements ?? []).length
                const approvedReqs = (p.requirements ?? []).filter((r) => r.status === 'approved').length
                return (
                  <div key={p.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-950">{p.company_name}</p>
                        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{p.source?.replaceAll('_', ' ')} · {p.confirmation_channel || 'channel not set'}</p>
                      </div>
                      <Badge variant={statusTones[p.status] ?? 'neutral'} icon={false} className="shrink-0">{p.status.replaceAll('_', ' ')}</Badge>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReviewingParticipantId(p.id)}
                      className="flex items-center gap-1.5 self-start text-xs font-bold text-brand-navy hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {totalReqs ? `${approvedReqs}/${totalReqs} requirements approved` : 'View requirements'}
                    </button>

                    <Select value={p.status} onValueChange={(value) => action(() => adminService.updateJobFairParticipation(id, p.id, { status: value }), 'Participation updated.')}>
                      <SelectTrigger className="mt-auto"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statusGroups.map((group) => (
                          <SelectGroup key={group.label}>
                            <SelectLabel>{group.label}</SelectLabel>
                            {group.statuses.map((s) => <SelectItem key={s} value={s}>{s.replaceAll('_', ' ')}</SelectItem>)}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="paper" className="space-y-6">
          <Card>
            <CardHeader title={<StepLabel step={1}>Encode walk-in employer paper form</StepLabel>} subtitle="Admin Proxy Encoding does not create an employer account." />

            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-slate-600">Employer Details</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Company name" value={proxy.company_name} onChange={(v) => setProxy((x) => ({ ...x, company_name: v }))} />
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Employer type
                    <select value={proxy.employer_type} onChange={(e) => setProxy((x) => ({ ...x, employer_type: e.target.value }))} className={inputClass}>
                      <option value="paper_only_employer">Paper-only</option>
                      <option value="walk_in_employer">Walk-in</option>
                      <option value="out_of_town_employer">Out-of-town</option>
                      <option value="registered_employer">Registered</option>
                    </select>
                  </label>
                  <Field label="Contact person" value={proxy.contact_person} onChange={(v) => setProxy((x) => ({ ...x, contact_person: v }))} />
                  <Field label="Contact number" value={proxy.contact_number} onChange={(v) => setProxy((x) => ({ ...x, contact_number: v }))} />
                  <Field label="Job Fair Clearance No." value={proxy.clearance_no} onChange={(v) => setProxy((x) => ({ ...x, clearance_no: v }))} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-slate-600">Aggregate Totals</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Male applicants" type="number" value={proxy.total_male} onChange={(v) => setProxy((x) => ({ ...x, total_male: v }))} />
                  <Field label="Female applicants" type="number" value={proxy.total_female} onChange={(v) => setProxy((x) => ({ ...x, total_female: v }))} />
                  <Field label="Total applicants" type="number" value={proxy.total_applicants} onChange={(v) => setProxy((x) => ({ ...x, total_applicants: v }))} />
                  <Field label="Qualified" type="number" value={proxy.total_qualified} onChange={(v) => setProxy((x) => ({ ...x, total_qualified: v }))} />
                  <Field label="Hired on the spot" type="number" value={proxy.total_hots} onChange={(v) => setProxy((x) => ({ ...x, total_hots: v }))} />
                  <Field label="Near-hired" type="number" value={proxy.total_near_hired} onChange={(v) => setProxy((x) => ({ ...x, total_near_hired: v }))} />
                  <Field label="Mismatched (rejected)" type="number" value={proxy.total_rejected} onChange={(v) => setProxy((x) => ({ ...x, total_rejected: v }))} />
                  <Field label="Vacancies solicited" type="number" value={proxy.total_vacancies_solicited} onChange={(v) => setProxy((x) => ({ ...x, total_vacancies_solicited: v }))} />
                  <Field label="Vacancies offered" type="number" value={proxy.total_vacancies_offered} onChange={(v) => setProxy((x) => ({ ...x, total_vacancies_offered: v }))} />
                </div>
                <Field label="Remarks" textarea value={proxy.remarks} onChange={(v) => setProxy((x) => ({ ...x, remarks: v }))} className="mt-4 block" />
              </div>

              <div>
                <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-slate-600">
                  Per-applicant register <span className="font-normal normal-case text-slate-400">(optional — leave empty to save aggregate totals only)</span>
                </p>
                <JobFairResultEntryEditor entries={proxyEntries} onChange={setProxyEntries} searchApplicants={adminService.searchApplicantSuggestions} />
              </div>
            </div>

            <Button
              className="mt-5"
              icon={Save}
              onClick={() => action(() => adminService.submitJobFairProxyResults(id, {
                ...proxy,
                entries: proxyEntries.filter((e) => e.applicant_name && e.position_applied_for)
                  .map((e) => ({ ...e, mismatch_code: e.mismatch_code || null })),
              }), 'Admin Proxy Encoded report saved.')}
            >
              Save Proxy Report
            </Button>
          </Card>

          <Card>
            <CardHeader title={<StepLabel step={2}>Encode manual confirmation slip</StepLabel>} subtitle="For confirmations received by phone, email, or paper." />

            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-slate-600">Company & Representative</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Company name" value={proxyConfirmation.company_name} onChange={(v) => setProxyConfirmation((x) => ({ ...x, company_name: v }))} />
                  <Field label="Email" type="email" value={proxyConfirmation.email} onChange={(v) => setProxyConfirmation((x) => ({ ...x, email: v }))} />
                  <Field label="Representative name" value={proxyConfirmation.representative_1_name} onChange={(v) => setProxyConfirmation((x) => ({ ...x, representative_1_name: v }))} />
                  <Field label="Representative contact" value={proxyConfirmation.representative_1_contact} onChange={(v) => setProxyConfirmation((x) => ({ ...x, representative_1_contact: v }))} />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={proxyConfirmation.will_conduct_onsite_interview} onChange={(e) => setProxyConfirmation((x) => ({ ...x, will_conduct_onsite_interview: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" />
                    Will conduct on-site interview
                  </label>
                </div>
                <Field label="Logistics requests" textarea value={proxyConfirmation.logistics_requests} onChange={(v) => setProxyConfirmation((x) => ({ ...x, logistics_requests: v }))} className="mt-4 block" />
              </div>

              <div>
                <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-600">List of Vacancies / Orders</p>
                <ConfirmationVacancyEditor vacancies={proxyConfirmationVacancies} onChange={setProxyConfirmationVacancies} />
              </div>
            </div>

            <Button
              className="mt-5"
              icon={Save}
              onClick={() => action(() => adminService.submitJobFairProxyConfirmation(id, {
                ...proxyConfirmation, vacancies: stripBlankConfirmationVacancies(proxyConfirmationVacancies),
              }), 'Manual confirmation slip saved.')}
            >
              Save Confirmation
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {reports.length > 0 && (
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Establishments reported" value={reports.length} icon={FileText} color="blue" />
              <StatCard label="Total applicants" value={unifiedTotals.total_applicants} icon={Users} color="blue" />
              <StatCard label="Hired on the spot" value={unifiedTotals.total_hots} icon={Flame} color="amber" />
              <StatCard label="Mismatched" value={unifiedTotals.total_rejected} icon={XCircle} color="red" />
            </section>
          )}

          <Card padding="none">
            <div className="border-b border-slate-100 p-5">
              <CardHeader title="Merged post-event reports" subtitle="Self-service and Admin Proxy Encoded records share one deduplicated reporting source." />
            </div>
            <div className="divide-y divide-slate-100">
              {reports.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-500">No post-event reports yet.</p>
              ) : reports.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-bold text-slate-900">{r.company_name}</p>
                    <p className="text-xs font-semibold text-slate-500">{r.source === 'admin_proxy' ? 'Admin Proxy Encoded' : 'Employer Self-Service'} · {r.total_applicants} applicants · {r.total_hots} HOTS</p>
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
                        <button type="button" onClick={() => blobDownload(() => adminService.viewJobFairRequirement(submitted.id), submitted.original_filename || `requirement-${submitted.id}`)} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline">
                          <FileText className="h-3.5 w-3.5" />View {submitted.original_filename}
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
    </div>
  )
}
