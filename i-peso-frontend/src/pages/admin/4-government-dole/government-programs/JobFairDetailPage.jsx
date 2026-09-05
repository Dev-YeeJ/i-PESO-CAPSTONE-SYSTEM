import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Download, FileText, Mail, RefreshCw, Save, ShieldCheck } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertBox, Badge, Button, Card, CardHeader, LoadingSkeleton } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import LocationPreviewCard from '@/components/maps/LocationPreviewCard'
import { adminService } from '@/services/adminService'

const statuses = ['invited', 'interested', 'called_peso', 'pending_response', 'accepted', 'declined', 'requirements_pending', 'requirements_submitted', 'under_review', 'approved', 'rejected', 'attended', 'no_show', 'encoded_results', 'report_generated']
const statusTones = {
  approved: 'approved', attended: 'approved', encoded_results: 'approved', report_generated: 'approved',
  accepted: 'review', under_review: 'review', requirements_submitted: 'review',
  invited: 'pending', interested: 'pending', called_peso: 'pending', pending_response: 'pending', requirements_pending: 'pending',
  declined: 'rejected', rejected: 'rejected', no_show: 'rejected',
}
const zeroProxy = { company_name: '', employer_type: 'paper_only_employer', contact_person: '', contact_number: '', total_male: 0, total_female: 0, total_applicants: 0, total_hots: 0, total_near_hired: 0, total_rejected: 0, total_vacancies_solicited: 0, total_vacancies_offered: 0, remarks: '' }
const zeroProxyConfirmation = { company_name: '', representative_1_name: '', representative_1_contact: '', email: '', number_of_job_vacancies: 0, will_conduct_onsite_interview: false, logistics_requests: '' }
const inputClass = 'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/10'

export default function JobFairDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [fair, setFair] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [employerId, setEmployerId] = useState('')
  const [proxy, setProxy] = useState(zeroProxy)
  const [proxyConfirmation, setProxyConfirmation] = useState(zeroProxyConfirmation)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      setFair(await adminService.getJobFairDetail(id))
    } catch (e) {
      setError(e.response?.data?.message ?? 'Unable to load event.')
    } finally {
      setLoading(false)
    }
  }, [id])
  useEffect(() => { load() }, [load])

  const metrics = fair?.metrics ?? {}
  const reports = useMemo(() => fair?.result_reports ?? [], [fair])

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

  if (loading && !fair) {
    return (
      <div className="portal-page">
        <LoadingSkeleton variant="text" rows={2} className="max-w-md" />
        <LoadingSkeleton variant="stat" rows={4} />
        <LoadingSkeleton variant="card" rows={2} />
      </div>
    )
  }

  return (
    <div className="portal-page">
      <PageHeader
        title={fair?.title ?? 'Job Fair'}
        subtitle="Pre-event coordination and post-event omnichannel reporting."
        eyebrow="Zero-Interference Job Fair"
        actions={[
          { label: 'Back', onClick: () => navigate('/admin/job-fairs'), variant: 'secondary' },
          { label: 'Edit', onClick: () => navigate(`/admin/job-fairs/${id}/edit`), variant: 'secondary' },
        ]}
      />

      {error && <AlertBox variant="danger" title="Action failed">{error}</AlertBox>}
      {notice && <AlertBox variant="success" title="Saved">{notice}</AlertBox>}

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        <strong>Physical event status quo:</strong> during the physical event, i-PESO does not force digital crowd control. Employers use their normal tables and paper resumes; the system focuses on coordination before the event and report automation afterward.
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {[
          ['Approved', metrics.approved], ['Attended', metrics.attended],
          ['Self-Service', metrics.self_service_reports], ['Admin Proxy', metrics.proxy_reports],
          ['Applicants', metrics.total_applicants], ['HOTS', metrics.total_hots],
          ['Near Hired', metrics.total_near_hired], ['Rejected', metrics.total_rejected],
        ].map(([label, value]) => (
          <Card key={label} padding="sm">
            <p className="text-2xl font-black text-slate-950">{value ?? 0}</p>
            <p className="text-xs font-bold text-slate-500">{label}</p>
          </Card>
        ))}
      </section>

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
            <Button variant="outline" icon={Download} onClick={() => blobDownload(() => adminService.downloadJobFairSprs(id), `sprs-1-6-${id}.pdf`)}>
              SPRS 1.6
            </Button>
          </div>
          <div className="mt-5 flex gap-2">
            <input
              value={employerId}
              onChange={(e) => setEmployerId(e.target.value)}
              placeholder="Verified employer ID"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <Button icon={Mail} onClick={() => action(() => adminService.inviteJobFairEmployer(id, { employer_id: Number(employerId) }), 'Employer invited.')}>
              Invite
            </Button>
          </div>
          {fair?.latitude && fair?.longitude && (
            <div className="mt-5">
              <LocationPreviewCard title="Venue Pin" fullAddress={fair.full_address || fair.venue} latitude={fair.latitude} longitude={fair.longitude} isAdmin verified={Boolean(fair.google_place_id)} />
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Encode walk-in employer paper form" subtitle="Admin Proxy Encoding does not create an employer account." />
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(proxy).map(([key, value]) => key === 'employer_type' ? (
              <label key={key} className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Employer type
                <select value={value} onChange={(e) => setProxy((x) => ({ ...x, [key]: e.target.value }))} className={inputClass}>
                  <option value="paper_only_employer">Paper-only</option>
                  <option value="walk_in_employer">Walk-in</option>
                  <option value="out_of_town_employer">Out-of-town</option>
                  <option value="registered_employer">Registered</option>
                </select>
              </label>
            ) : (
              <label key={key} className={`text-xs font-bold uppercase tracking-wide text-slate-500 ${key === 'remarks' ? 'sm:col-span-2' : ''}`}>
                {key.replaceAll('_', ' ')}
                <input
                  type={typeof value === 'number' ? 'number' : 'text'}
                  min="0"
                  value={value}
                  onChange={(e) => setProxy((x) => ({ ...x, [key]: typeof value === 'number' ? Number(e.target.value) : e.target.value }))}
                  className={`normal-case ${inputClass}`}
                />
              </label>
            ))}
          </div>
          <Button className="mt-4" icon={Save} onClick={() => action(() => adminService.submitJobFairProxyResults(id, proxy), 'Admin Proxy Encoded report saved.')}>
            Save Proxy Report
          </Button>
        </Card>
      </div>

      <Card>
        <CardHeader title="Encode manual confirmation slip" subtitle="For confirmations received by phone, email, or paper." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(proxyConfirmation).map(([key, value]) => key === 'will_conduct_onsite_interview' ? (
            <label key={key} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={value} onChange={(e) => setProxyConfirmation((x) => ({ ...x, [key]: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" />
              On-site interview
            </label>
          ) : (
            <label key={key} className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {key.replaceAll('_', ' ')}
              <input
                type={typeof value === 'number' ? 'number' : key === 'email' ? 'email' : 'text'}
                min="0"
                value={value}
                onChange={(e) => setProxyConfirmation((x) => ({ ...x, [key]: typeof value === 'number' ? Number(e.target.value) : e.target.value }))}
                className={`normal-case ${inputClass}`}
              />
            </label>
          ))}
        </div>
        <Button className="mt-4" icon={Save} onClick={() => action(() => adminService.submitJobFairProxyConfirmation(id, proxyConfirmation), 'Manual confirmation slip saved.')}>
          Save Confirmation
        </Button>
      </Card>

      <Card padding="none">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <CardHeader title="Employer participants" subtitle="Digital and manual confirmation channels are equally supported." />
          <Button variant="outline" icon={RefreshCw} onClick={load}>Refresh</Button>
        </div>

        <div className="divide-y divide-slate-100">
          {!(fair?.participants ?? []).length ? (
            <p className="p-8 text-center text-sm text-slate-500">No employer participation records yet.</p>
          ) : fair.participants.map((p) => (
            <div key={p.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{p.company_name}</p>
                  <p className="text-xs font-semibold text-slate-500">{p.source?.replaceAll('_', ' ')} · {p.confirmation_channel || 'channel not set'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusTones[p.status] ?? 'neutral'} icon={false}>{p.status.replaceAll('_', ' ')}</Badge>
                  <select
                    value={p.status}
                    onChange={(e) => action(() => adminService.updateJobFairParticipation(id, p.id, { status: e.target.value }), 'Participation updated.')}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                  >
                    {statuses.map((s) => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {(fair.requirements ?? []).map((req) => {
                  const submitted = p.requirements?.find((x) => x.job_fair_requirement_id === req.id)
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
            </div>
          ))}
        </div>
      </Card>

      <Card padding="none">
        <div className="border-b border-slate-100 p-5">
          <CardHeader title="Merged post-event reports" subtitle="Self-service and Admin Proxy Encoded records share one deduplicated reporting source." />
        </div>
        <div className="divide-y divide-slate-100">
          {reports.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-bold text-slate-900">{r.company_name}</p>
                <p className="text-xs font-semibold text-slate-500">{r.source === 'admin_proxy' ? 'Admin Proxy Encoded' : 'Employer Self-Service'} · {r.total_applicants} applicants · {r.total_hots} HOTS</p>
              </div>
              <Button size="sm" variant="outline" icon={Download} onClick={() => blobDownload(() => adminService.downloadJobFairResult(r.id), `ro1-jf-form-3-${r.id}.pdf`)}>
                RO1-JF Form 3
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
