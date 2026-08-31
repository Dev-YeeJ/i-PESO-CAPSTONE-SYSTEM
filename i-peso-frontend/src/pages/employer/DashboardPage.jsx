import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, BriefcaseBusiness, Building2, CheckCircle2, CircleCheck, Clock3, FileCheck2, FilePenLine, FileX2, Plus, RotateCcw, ShieldCheck, MapPin, Upload } from 'lucide-react'
import PendingVerificationBanner from './components/PendingVerificationBanner'
import { AlertBox, Badge, Button, Card, CardHeader, LoadingSkeleton, StatCard } from '@/components/ui'
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
  government_id: 'Government ID',
  authorization_letter: 'Authorization Letter',
}

export default function EmployerDashboard() {
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const [profile, setProfile] = useState(null)
  const [vacancies, setVacancies] = useState([])
  const [error, setError] = useState('')
  const [reuploadError, setReuploadError] = useState('')
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
          employer: {
            ...user?.employer,
            logo_url: result.employer.company_logo_url,
          }
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

  const handleReupload = useCallback(async (documentType, file, expirationDate = null) => {
    setReuploadingType(documentType)
    setReuploadError('')
    setReuploadNotice('')
    try {
      await employerService.reuploadDocument(documentType, file, expirationDate)
      setReuploadNotice(`${DOCUMENT_LABELS[documentType] ?? documentType} has been re-uploaded and is now under review.`)
      await loadProfile()
    } catch (requestError) {
      const msg = requestError.response?.data?.message
        ?? requestError.response?.data?.errors?.document_file?.[0]
        ?? requestError.response?.data?.errors?.expiration_date?.[0]
        ?? 'Unable to re-upload the document.'
      setReuploadError(msg)
    } finally {
      setReuploadingType(null)
    }
  }, [loadProfile])

  const status = profile?.employer?.verification_status ?? user?.verification_status ?? 'pending'
  const company = profile?.employer?.company_name ?? user?.company_name ?? user?.name ?? 'Employer'
  const documents = profile?.documents ?? []
  const hasRejectedDocuments = documents.some((doc) => doc.verification_status === 'rejected')
  const effectiveStatus = status === 'pending' && hasRejectedDocuments ? 'rejected' : status
  
  const requiredDocuments = useMemo(() => {
    const base = profile?.required_documents ?? []
    if (base.length === 0) return base
    const augmented = [...base, 'government_id']
    if (profile?.employer?.representative_is_owner === 0 || profile?.employer?.representative_is_owner === false) {
      augmented.push('authorization_letter')
    }
    return augmented
  }, [profile])
  
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
    const total = Math.max(requiredDocuments.length, documents.length) || 1
    return { approved, rejected, pending, total, percent: Math.min(100, Math.round((approved / total) * 100)) }
  }, [documents, requiredDocuments])

  if (loading) return (
    <div className="portal-page">
      <LoadingSkeleton variant="text" rows={2} className="max-w-md" />
      <LoadingSkeleton variant="stat" rows={4} />
      <LoadingSkeleton variant="card" rows={2} />
    </div>
  )

  return (
    <div className="portal-page">
      {/* Hero Banner Section */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 mb-6">
        <div className="h-32 bg-gradient-to-r from-brand-navy to-blue-700 sm:h-48" />
        <div className="relative px-5 pb-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative -mt-10 shrink-0 sm:-mt-12">
                <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg sm:h-32 sm:w-32">
                  {profile?.employer?.company_logo_url ? (
                    <img src={profile.employer.company_logo_url} alt="Logo" className="h-full w-full object-contain p-2" />
                  ) : (
                    <Building2 className="h-10 w-10 text-slate-300 sm:h-12 sm:w-12" />
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1 pt-1 sm:pt-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600 mb-1">PESO Employer Workspace</p>
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-2xl font-black text-slate-950 sm:text-3xl">{company}</h1>
                </div>
                <p className="text-sm font-semibold text-slate-500 mt-1">{profile?.employer?.industry || 'Employer Account'}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:mt-0 sm:mb-4 sm:flex-row sm:items-center">
              <Badge status={effectiveStatus === 'verified' ? 'approved' : effectiveStatus === 'rejected' ? 'rejected' : 'pending'}>{effectiveStatus === 'verified' ? 'Verified' : effectiveStatus}</Badge>
              {effectiveStatus === 'verified' && <Button to="/employer/post-job" icon={Plus}>Post New Vacancy</Button>}
            </div>
          </div>
        </div>
      </div>

      {error && <AlertBox variant="danger" title="Employer workspace unavailable">{error}</AlertBox>}
      {reuploadError && <AlertBox variant="danger" title="Document re-upload failed">{reuploadError}</AlertBox>}
      {reuploadNotice && <AlertBox variant="success" title="Document re-uploaded">{reuploadNotice}</AlertBox>}
      <PendingVerificationBanner status={effectiveStatus} rejectionReason={profile?.employer?.rejection_reason} documents={documents} requiredDocuments={requiredDocuments} onReupload={handleReupload} reuploadingType={reuploadingType} />

      {effectiveStatus === 'verified' && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={BriefcaseBusiness} color="blue" label="Active Vacancies" value={counts.active} subtitle={`${counts.openings} total opening${counts.openings === 1 ? '' : 's'}`} hint="Published vacancies currently visible to job seekers." />
          <StatCard icon={FilePenLine} color="amber" label="Draft Vacancies" value={counts.draft} subtitle="Not visible to seekers" hint="Saved postings you have not published yet." />
          <StatCard icon={CircleCheck} color="slate" label="Closed Vacancies" value={counts.closed} subtitle="Completed postings" hint="Postings that are no longer accepting applications." />
          <StatCard icon={ShieldCheck} color="green" label="Account Access" value="Enabled" subtitle="Based on PESO approval" hint="Whether your PESO accreditation currently allows posting vacancies." />
        </div>
      )}

      {effectiveStatus === 'verified' ? (
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <Card>
            <CardHeader
              title="Vacancy Portfolio"
              subtitle="A compact view of your most recent job postings."
              action={<Button to="/employer/vacancies" variant="secondary" size="sm" icon={ArrowRight}>View All</Button>}
            />
            {vacancies.length ? (
              <div className="grid gap-4 mt-4">
                {vacancies.slice(0, 6).map((vacancy) => (
                  <div key={vacancy.post_id} className="group flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-brand-navy hover:shadow-md sm:flex-row sm:items-center">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{vacancy.job_title}</h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{vacancy.location || vacancy.place_of_work || 'Multiple Locations'}</span>
                        <span className="flex items-center gap-1"><BriefcaseBusiness className="h-3 w-3" />{vacancy.nature_of_work || vacancy.employment_type?.replaceAll('_', ' ')}</span>
                      </div>
                    </div>
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

function AccreditationDocRow({ docType, label, status, uploadedAt, optional, accountStatus, onReupload, reuploadingType }) {
  const fileInputRef = useRef(null)
  const [expirationDate, setExpirationDate] = useState('')
  const [showDateInput, setShowDateInput] = useState(false)

  const configs = {
    approved: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'border-emerald-200 bg-emerald-50/50', badge: 'Approved' },
    rejected: { icon: FileX2, color: 'text-red-600', bg: 'border-red-200 bg-red-50/50', badge: 'Rejected' },
    pending: { icon: Clock3, color: 'text-amber-600', bg: 'border-amber-200 bg-amber-50/50', badge: 'Under Review' },
    not_uploaded: { icon: FileX2, color: 'text-slate-400', bg: 'border-slate-200 bg-slate-50', badge: 'Not Uploaded' },
  }
  const config = configs[status] ?? configs.pending
  const formattedDate = uploadedAt ? new Date(uploadedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : null

  // Allow re-upload when:
  // - Document is rejected or not uploaded (always)
  // - Document is pending AND the account is rejected (employer can replace pending docs too)
  const canReupload = status === 'rejected' || status === 'not_uploaded' || (status === 'pending' && accountStatus === 'rejected')
  const isMayorsPermit = docType === 'mayors_permit'
  const isUploading = reuploadingType === docType

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!validTypes.includes(file.type)) {
      alert('Please upload PDF or image files only (PDF, JPG, PNG)')
      e.target.value = ''
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      e.target.value = ''
      return
    }

    if (isMayorsPermit && !expirationDate) {
      alert("Please enter the Mayor's Permit expiration date before uploading.")
      e.target.value = ''
      return
    }

    onReupload?.(docType, file, isMayorsPermit ? expirationDate : null)
    e.target.value = ''
    setExpirationDate('')
    setShowDateInput(false)
  }

  return (
    <div className={`rounded-xl border px-4 py-3 transition-colors ${config.bg}`}>
      <div className="flex items-center gap-3">
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
              {isMayorsPermit ? (
                showDateInput ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={expirationDate}
                      min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-brand-navy focus:outline-none"
                      placeholder="Expiry date"
                    />
                    <button
                      type="button"
                      onClick={() => expirationDate && fileInputRef.current?.click()}
                      disabled={isUploading || !expirationDate}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-navy hover:text-brand-navy disabled:pointer-events-none disabled:opacity-50"
                    >
                      {isUploading ? <><span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-brand-navy" />Uploading...</> : <><Upload className="h-3.5 w-3.5" />Select file</>}
                    </button>
                    <button type="button" onClick={() => setShowDateInput(false)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDateInput(true)}
                    disabled={isUploading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-navy hover:text-brand-navy disabled:pointer-events-none disabled:opacity-50"
                  >
                    {isUploading ? <><span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-brand-navy" />Uploading...</> : <><Upload className="h-3.5 w-3.5" />{status === 'not_uploaded' ? 'Upload' : 'Re-upload'}</>}
                  </button>
                )
              ) : (
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
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
