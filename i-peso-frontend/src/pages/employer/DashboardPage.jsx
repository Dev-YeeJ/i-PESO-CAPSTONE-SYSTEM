import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, BriefcaseBusiness, Building2, CheckCircle2, CircleCheck, Clock3, FileCheck2, FilePenLine, FileX2, Plus, RotateCcw, ShieldCheck, Upload } from 'lucide-react'
import PendingVerificationBanner from './components/PendingVerificationBanner'
import { AlertBox, Badge, Button, Card, CardHeader } from '@/components/ui'
import * as employerService from '@/services/employerService'
import { useAuthStore } from '@/stores/authStore'

const DOCUMENT_LABELS = {
  mayors_permit: "Mayor's Permit",
  bir_certificate: 'BIR Certificate',
  dti_certificate: 'DTI Certificate',
  sec_certificate: 'SEC Certificate',
  prpa_license: 'PRPA License',
  dme_poea_license: 'DMW/POEA License',
  philJobnet_proof: 'PhilJobNet Proof',
}

export default function EmployerDashboard() {
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const [profile, setProfile] = useState(null)
  const [vacancies, setVacancies] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reuploadingType, setReuploadingType] = useState(null)
  const [reuploadNotice, setReuploadNotice] = useState('')

  const loadProfile = useCallback(() => {
    return employerService.getProfile()
      .then((result) => {
        setProfile(result)
        updateUser({
          verification_status: result.employer.verification_status,
          company_name: result.employer.company_name,
          name: result.employer.company_name,
        })
        setLoading(false)
        if (result.employer.verification_status === 'verified') {
          employerService.getVacancies({ per_page: 12 })
            .then((vacancyResult) => setVacancies(vacancyResult.data ?? []))
            .catch((requestError) => setError(requestError.response?.data?.message ?? 'Vacancy summary could not be loaded.'))
        }
      })
      .catch((requestError) => setError(requestError.response?.data?.message ?? 'Unable to load the employer workspace.'))
      .finally(() => setLoading(false))
  }, [updateUser])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleReupload = useCallback(async (documentType, file) => {
    setReuploadingType(documentType)
    setError('')
    setReuploadNotice('')
    try {
      await employerService.reuploadDocument(documentType, file)
      setReuploadNotice(`${DOCUMENT_LABELS[documentType] ?? documentType} has been re-uploaded and is now under review.`)
      await loadProfile()
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? requestError.response?.data?.errors?.document_file?.[0] ?? 'Unable to re-upload the document.')
    } finally {
      setReuploadingType(null)
    }
  }, [loadProfile])

  const status = profile?.employer?.verification_status ?? user?.verification_status ?? 'pending'
  const company = profile?.employer?.company_name ?? user?.company_name ?? user?.name ?? 'Employer'
  const documents = profile?.documents ?? []
  const requiredDocuments = profile?.required_documents ?? []
  const counts = useMemo(() => ({
    active: vacancies.filter((item) => item.status === 'active').length,
    draft: vacancies.filter((item) => item.status === 'draft').length,
    closed: vacancies.filter((item) => item.status === 'closed').length,
    openings: vacancies.filter((item) => item.status === 'active').reduce((sum, item) => sum + Number(item.vacancies_count ?? 0), 0),
  }), [vacancies])

  const docStats = useMemo(() => {
    const approved = documents.filter((d) => d.verification_status === 'approved').length
    const rejected = documents.filter((d) => d.verification_status === 'rejected').length
    const pending = documents.filter((d) => d.verification_status === 'pending' || !d.verification_status).length
    const total = requiredDocuments.length || documents.length || 1
    return { approved, rejected, pending, total, percent: Math.round((approved / total) * 100) }
  }, [documents, requiredDocuments])

  if (loading) return <div className="portal-page animate-pulse"><div className="h-44 rounded-xl bg-slate-200" /><div className="grid gap-4 md:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 rounded-xl bg-slate-200" />)}</div></div>

  return (
    <div className="portal-page">
      <section className="portal-card-hero relative overflow-hidden rounded-xl border border-blue-900 bg-brand-navy px-6 py-7 text-white shadow-elevated sm:px-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-300">PESO Employer Workspace</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight">{company}</h1>
              <Badge variant={status} className="border-white/10">Accreditation: {status}</Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/75">Manage accredited vacancies and monitor your company&apos;s hiring activity through i-PESO.</p>
          </div>
          {status === 'verified' && <Button to="/employer/post-job" icon={Plus}>Post New Vacancy</Button>}
        </div>
      </section>

      {error && <AlertBox variant="danger" title="Employer workspace unavailable">{error}</AlertBox>}
      {reuploadNotice && <AlertBox variant="success" title="Document re-uploaded">{reuploadNotice}</AlertBox>}
      <PendingVerificationBanner status={status} rejectionReason={profile?.employer?.rejection_reason} documents={documents} requiredDocuments={requiredDocuments} onReupload={handleReupload} reuploadingType={reuploadingType} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={BriefcaseBusiness} label="Active Vacancies" value={counts.active} detail={`${counts.openings} total opening${counts.openings === 1 ? '' : 's'}`} tone="brand" />
        <Metric icon={FilePenLine} label="Draft Vacancies" value={counts.draft} detail="Not visible to seekers" tone="amber" />
        <Metric icon={CircleCheck} label="Closed Vacancies" value={counts.closed} detail="Completed postings" tone="slate" />
        <Metric icon={ShieldCheck} label="Account Access" value={status === 'verified' ? 'Enabled' : 'Limited'} detail="Based on PESO approval" tone="emerald" />
      </div>

      {/* ── ACCREDITATION TRACKER ──────────────────────────────── */}
      {status !== 'verified' && documents.length > 0 && (
        <Card>
          <CardHeader
            title="Accreditation Tracker"
            subtitle="Track the verification status of each required document submitted to PESO."
            action={
              <Badge variant={docStats.approved === docStats.total ? 'approved' : docStats.rejected > 0 ? 'rejected' : 'pending'}>
                {docStats.approved} of {docStats.total} approved
              </Badge>
            }
          />

          {/* Progress Bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Overall Verification</span>
              <span>{docStats.percent}%</span>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="flex h-full items-center justify-center rounded-full text-[9px] font-bold text-white transition-all duration-700"
                style={{
                  width: `${Math.max(docStats.percent, 5)}%`,
                  background: docStats.rejected > 0
                    ? 'linear-gradient(90deg, #ef4444, #f97316)'
                    : docStats.percent === 100
                      ? 'linear-gradient(90deg, #10b981, #059669)'
                      : 'linear-gradient(90deg, #f59e0b, #eab308)',
                }}
              >
                {docStats.percent > 15 && `${docStats.percent}%`}
              </div>
            </div>
          </div>

          {/* Status summary tiles */}
          <div className="mb-5 grid grid-cols-3 gap-3">
            <AccreditationStat icon={FileCheck2} label="Approved" count={docStats.approved} color="emerald" />
            <AccreditationStat icon={Clock3} label="Under Review" count={docStats.pending} color="amber" />
            <AccreditationStat icon={FileX2} label="Rejected" count={docStats.rejected} color="red" />
          </div>

          {/* Per-document rows */}
          <div className="space-y-2">
            {requiredDocuments.map((docType) => {
              const doc = documents.find((d) => d.document_type === docType)
              const docStatus = doc?.verification_status ?? 'not_uploaded'
              return (
                <AccreditationDocRow
                  key={docType}
                  docType={docType}
                  label={DOCUMENT_LABELS[docType] ?? docType}
                  status={docStatus}
                  uploadedAt={doc?.uploaded_at}
                  onReupload={handleReupload}
                  reuploadingType={reuploadingType}
                />
              )
            })}
            {/* Show any extra documents not in required list */}
            {documents
              .filter((d) => !requiredDocuments.includes(d.document_type))
              .map((doc) => (
                <AccreditationDocRow
                  key={doc.document_id}
                  docType={doc.document_type}
                  label={DOCUMENT_LABELS[doc.document_type] ?? doc.document_type}
                  status={doc.verification_status ?? 'pending'}
                  uploadedAt={doc.uploaded_at}
                  optional
                  onReupload={handleReupload}
                  reuploadingType={reuploadingType}
                />
              ))
            }
          </div>

          {status === 'rejected' && (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <RotateCcw className="h-5 w-5 shrink-0 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-800">Resubmission required</p>
                <p className="mt-0.5 text-xs leading-5 text-red-700/80">One or more documents were rejected. Navigate to Employer Registration to re-upload corrected documents.</p>
              </div>
              <Button to="/employer/registration" variant="danger" size="sm">Resubmit</Button>
            </div>
          )}
        </Card>
      )}

      {status === 'verified' ? (
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <Card>
            <CardHeader
              title="Vacancy Portfolio"
              subtitle="A compact view of your most recent job postings."
              action={<Button to="/employer/vacancies" variant="secondary" size="sm" icon={ArrowRight}>View All</Button>}
            />
            {vacancies.length ? (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-[1fr_auto] bg-brand-navy px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-300 sm:grid-cols-[1.3fr_0.7fr_0.5fr_auto]">
                  <span>Position</span><span className="hidden sm:block">Location</span><span className="hidden sm:block">Openings</span><span>Status</span>
                </div>
                {vacancies.slice(0, 6).map((vacancy) => (
                  <div key={vacancy.post_id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-slate-100 px-4 py-4 last:border-0 sm:grid-cols-[1.3fr_0.7fr_0.5fr_auto]">
                    <div><p className="font-bold text-slate-900">{vacancy.job_title}</p><p className="mt-0.5 text-xs capitalize text-slate-500">{vacancy.employment_type?.replaceAll('_', ' ')}</p></div>
                    <span className="hidden text-sm text-slate-600 sm:block">{vacancy.location}</span>
                    <span className="hidden text-sm font-bold text-slate-700 sm:block">{vacancy.vacancies_count}</span>
                    <Badge variant={vacancy.status}>{vacancy.status}</Badge>
                  </div>
                ))}
              </div>
            ) : <EmptyVacancy />}
          </Card>

          <Card>
            <CardHeader title="Hiring Workflow" subtitle="Vacancy stages across your employer account." />
            <div className="grid gap-3">
              <PipelineStage label="Draft" count={counts.draft} description="Prepare requirements and job details" color="bg-slate-400" />
              <PipelineStage label="Published" count={counts.active} description="Visible to qualified job seekers" color="bg-emerald-500" />
              <PipelineStage label="Closed" count={counts.closed} description="No longer accepting applications" color="bg-brand-700" />
            </div>
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-800">Applicant tracking</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">Applicant management and interview stages will appear here when those workflow modules are connected.</p>
            </div>
          </Card>
        </div>
      ) : !documents.length && (
        <Card>
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <span className="rounded-xl bg-amber-50 p-4 text-amber-700"><Clock3 className="h-7 w-7" /></span>
            <div className="flex-1"><h2 className="text-lg font-bold text-slate-950">Hiring tools are temporarily locked</h2><p className="mt-1 text-sm leading-6 text-slate-600">PESO must approve the employer accreditation and required documents before vacancies can be published.</p></div>
          </div>
        </Card>
      )}
    </div>
  )
}

function Metric({ icon, label, value, detail, tone }) {
  const tones = { brand: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-700', slate: 'bg-slate-100 text-slate-600', emerald: 'bg-emerald-50 text-emerald-700' }
  return <Card padding="sm"><div className="flex justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div><span className={`h-fit rounded-xl p-2.5 ${tones[tone]}`}>{createElement(icon, { className: 'h-5 w-5' })}</span></div></Card>
}

function PipelineStage({ label, count, description, color }) {
  return <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${color}`} /><p className="font-bold text-slate-900">{label}</p></div><span className="text-xl font-black text-slate-950">{count}</span></div><p className="mt-2 text-xs text-slate-500">{description}</p></div>
}

function EmptyVacancy() {
  return <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center"><Building2 className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-bold text-slate-800">No vacancies posted</p><p className="mt-1 text-sm text-slate-500">Create your first PESO-accredited job opportunity.</p><Button to="/employer/post-job" size="sm" className="mt-4" icon={Plus}>Post a Job</Button></div>
}

function AccreditationStat({ icon, label, count, color }) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <div className={`rounded-xl border p-3 text-center ${colorMap[color]}`}>
      {createElement(icon, { className: 'mx-auto h-5 w-5' })}
      <p className="mt-1.5 text-xl font-black">{count}</p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide">{label}</p>
    </div>
  )
}

function AccreditationDocRow({ docType, label, status, uploadedAt, optional, onReupload, reuploadingType }) {
  const fileInputRef = useRef(null)
  const configs = {
    approved: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'border-emerald-200 bg-emerald-50/50', badge: 'Approved' },
    rejected: { icon: FileX2, color: 'text-red-600', bg: 'border-red-200 bg-red-50/50', badge: 'Rejected' },
    pending: { icon: Clock3, color: 'text-amber-600', bg: 'border-amber-200 bg-amber-50/50', badge: 'Under Review' },
    not_uploaded: { icon: FileX2, color: 'text-slate-400', bg: 'border-slate-200 bg-slate-50', badge: 'Not Uploaded' },
  }
  const config = configs[status] ?? configs.pending
  const formattedDate = uploadedAt ? new Date(uploadedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : null
  const canReupload = status === 'rejected' || status === 'not_uploaded'
  const isUploading = reuploadingType === docType

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!validTypes.includes(file.type)) {
      alert('Please upload PDF or image files only (PDF, JPG, PNG)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    onReupload?.(docType, file)
    e.target.value = ''
  }

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${config.bg}`}>
      {createElement(config.icon, { className: `h-5 w-5 shrink-0 ${config.color}` })}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-800">
          {label}
          {optional && <span className="ml-2 text-[10px] font-semibold uppercase text-slate-400">Optional</span>}
        </p>
        {formattedDate && <p className="mt-0.5 text-xs text-slate-400">Uploaded {formattedDate}</p>}
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold ${config.color}`}>{config.badge}</span>
        {canReupload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              hidden
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-navy hover:text-brand-navy disabled:pointer-events-none disabled:opacity-50"
            >
              {isUploading ? (
                <><span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-brand-navy" />Uploading...</>
              ) : (
                <><Upload className="h-3.5 w-3.5" />{status === 'not_uploaded' ? 'Upload' : 'Re-upload'}</>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
