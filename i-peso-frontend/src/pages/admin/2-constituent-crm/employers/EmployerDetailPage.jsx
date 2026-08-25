import { createElement, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Building2, CheckCircle2, ChevronDown, Download, Eye, FileText, MapPin, ShieldAlert, ShieldCheck, XCircle, Mail, Phone, User, Clock, BriefcaseBusiness } from 'lucide-react'
import { Badge, Button, Card, CardHeader } from '@/components/ui'
import { adminService } from '@/services/adminService'

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

// Preset rejection reasons — the admin picks one instead of typing free-text notes.
const REJECTION_REASONS = [
  'Document is blurry or unreadable',
  'Document has expired',
  'Wrong document type uploaded',
  'Information does not match company records',
  'Document is incomplete or missing pages',
  'Document appears altered or invalid',
]

const formatValue = (value, fallback = 'Not provided') => {
  if (value === null || value === undefined || value === '') return fallback
  return String(value).replaceAll('_', ' ')
}

const formatDate = (value) => {
  if (!value) return 'Not provided'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function EmployerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [employer, setEmployer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [viewingDocumentId, setViewingDocumentId] = useState(null)
  const [previewDocument, setPreviewDocument] = useState(null)
  const [downloadDocument, setDownloadDocument] = useState(null)
  const [downloadReason, setDownloadReason] = useState('')
  const [downloading, setDownloading] = useState(false)
  // Unified review: every uploaded document is treated as "approved" unless the
  // admin rejects it. Keyed by document_id → preset rejection reason string.
  const [decisions, setDecisions] = useState({})
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState(null)
  // Track documents viewed during this session so UI updates immediately
  const [viewedDocumentIds, setViewedDocumentIds] = useState(new Set())
  // Verification documents accordion — expanded by default so the review
  // workflow (approve/reject) stays visible without an extra click.
  const [documentsExpanded, setDocumentsExpanded] = useState(true)

  const loadEmployer = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setEmployer(await adminService.getEmployerDetail(id))
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? requestError.response?.data?.error ?? 'Unable to load employer profile.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadEmployer()
  }, [loadEmployer])

  useEffect(() => () => {
    if (previewDocument?.url) URL.revokeObjectURL(previewDocument.url)
  }, [previewDocument])

  // Flag a document for rejection with a preset reason (toggles the row to red).
  const rejectRow = (documentId, reason) => {
    setError('')
    setDecisions((current) => ({ ...current, [documentId]: reason }))
  }

  // Revert a rejected row back to the default "approved" state.
  const undoRejectRow = (documentId) => {
    setDecisions((current) => {
      const next = { ...current }
      delete next[documentId]
      return next
    })
  }

  // Single unified action — the backend decides approve vs reject based on which
  // required documents were flagged.
  const finalize = async () => {
    const rejectedDocuments = Object.entries(decisions).map(([documentId, reason]) => ({
      document_id: Number(documentId),
      reason,
    }))

    setActionLoading(true)
    setError('')
    setNotice('')
    try {
      const result = await adminService.finalizeEmployerVerification(id, { rejectedDocuments })
      // Auto-close: return to the employer directory after a successful decision.
      navigate('/admin/employers', {
        state: {
          flash: result.outcome === 'approved'
            ? `${companyProfile.company_name || employer.company_name} has been approved and verified.`
            : `${companyProfile.company_name || employer.company_name} has been rejected. The employer was notified of the reason.`,
        },
      })
    } catch (requestError) {
      setError(requestError.response?.data?.error ?? requestError.response?.data?.message ?? 'Unable to save the verification decision.')
      setActionLoading(false)
      setConfirmDialog(null)
    }
  }

  const viewDocument = async (document) => {
    setViewingDocumentId(document.document_id)
    setError('')

    try {
      const file = await adminService.getEmployerDocument(document.document_id)
      const fileUrl = URL.createObjectURL(file)
      setPreviewDocument({ ...document, url: fileUrl, mimeType: file.type })
      setViewedDocumentIds((prev) => {
        const next = new Set(prev)
        next.add(document.document_id)
        return next
      })
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to open this document.')
    } finally {
      setViewingDocumentId(null)
    }
  }

  const closePreview = () => {
    if (previewDocument?.url) URL.revokeObjectURL(previewDocument.url)
    setPreviewDocument(null)
  }

  const confirmDownload = async () => {
    if (downloadReason.trim().length < 10) {
      setError('Provide an official download purpose of at least 10 characters.')
      return
    }

    setDownloading(true)
    setError('')

    try {
      const response = await adminService.downloadEmployerDocument(downloadDocument.document_id, downloadReason.trim())
      const fileUrl = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = downloadDocument.original_filename
      link.click()
      URL.revokeObjectURL(fileUrl)
      setDownloadDocument(null)
      setDownloadReason('')
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to download this document.')
    } finally {
      setDownloading(false)
    }
  }

  // Confirmation dialog helpers
  const showConfirm = ({ title, message, variant, confirmLabel, onConfirm }) => {
    setConfirmDialog({ title, message, variant, confirmLabel, onConfirm })
  }

  // One adaptive action: approve the employer, or reject it when a required
  // document was flagged / is missing.
  const handleFinalize = () => {
    const rejectedCount = Object.keys(decisions).length

    if (willReject) {
      const missingNote = missingDocuments.length > 0
        ? ` Missing required document(s): ${missingDocuments.map((t) => DOCUMENT_LABELS[t] ?? t).join(', ')}.`
        : ''
      const activeVacancyCount = activeVacanciesSummary?.total ?? 0
      const warningText = activeVacancyCount > 0
        ? ` This employer has ${activeVacancyCount} active vacanc${activeVacancyCount === 1 ? 'y' : 'ies'} that will be automatically closed.`
        : ''

      showConfirm({
        title: 'Reject Employer Accreditation',
        message: `A required document was rejected or is missing, so "${companyProfile.company_name || employer.company_name}" will be rejected.${missingNote}${warningText} The employer will receive an email and dashboard notification with the reason.`,
        variant: 'reject',
        confirmLabel: 'Confirm Rejection',
        onConfirm: finalize,
      })
      return
    }

    const rejectedNote = rejectedCount > 0
      ? ` ${rejectedCount} optional document(s) were flagged but do not block approval.`
      : ''

    showConfirm({
      title: 'Approve Employer Accreditation',
      message: `You are about to approve "${companyProfile.company_name || employer.company_name}" as a verified PESO employer. All submitted requirements will be marked approved.${rejectedNote} This enables job posting and the employer will be notified.`,
      variant: 'approve',
      confirmLabel: 'Confirm Approval',
      onConfirm: finalize,
    })
  }

  if (loading) return <div className="py-12 text-center text-slate-500 font-medium">Loading employer profile...</div>
  if (!employer) return <div className="py-12 text-center text-red-600 font-medium">{error || 'Employer not found'}</div>

  const companyProfile = employer.company_profile ?? employer.company ?? {}
  const representative = employer.representative_information ?? employer.representative ?? {}
  const businessAddress = employer.business_address ?? {}
  const verificationDocuments = employer.verification_documents ?? employer.documents ?? []
  const requiredDocuments = Array.isArray(employer.required_documents) ? employer.required_documents : []
  const missingDocuments = requiredDocuments.filter((type) => !verificationDocuments.some((document) => document.document_type === type))
  const dataQualityFlags = employer.data_quality_flags ?? {}
  const activeVacanciesSummary = employer.active_vacancies_summary ?? {}
  const closedVacanciesSummary = employer.closed_vacancies_summary ?? {}
  const applicationsSummary = employer.applications_summary ?? {}
  const jobFairParticipation = employer.job_fair_participation ?? []
  const verificationStatus = employer.verification_status ?? companyProfile.verification_status ?? 'pending'
  const verificationRemarks = employer.verification_remarks ?? companyProfile.rejection_reason ?? employer.rejection_reason

  // Unified review derivations — every uploaded doc counts as approved unless flagged.
  const isRejected = (doc) => doc && Boolean(decisions[doc.document_id])

  // Rows for the landscape table: every required type (uploaded or missing),
  // followed by any other uploaded documents (government ID, authorization letter, etc.).
  const documentRows = [
    ...requiredDocuments.map((type) => ({
      type,
      required: true,
      document: verificationDocuments.find((d) => d.document_type === type) || null,
    })),
    ...verificationDocuments
      .filter((d) => !requiredDocuments.includes(d.document_type))
      .map((d) => ({ type: d.document_type, required: false, document: d })),
  ]

  const requiredCount = requiredDocuments.length
  // Only count docs that are truly approved in the DB. "Pending" docs are NOT yet approved
  // even though they will be approved by default when the admin finalizes.
  const dbApprovedRequiredCount = requiredDocuments.filter((type) => {
    const doc = verificationDocuments.find((d) => d.document_type === type)
    return doc && doc.verification_status === 'approved'
  }).length

  // Check if all required documents have been viewed (only for unapproved docs)
  const unviewedRequiredDocs = requiredDocuments.filter((type) => {
    const doc = verificationDocuments.find((d) => d.document_type === type)
    if (!doc || doc.verification_status === 'approved') return false
    return !doc.viewed_at && !viewedDocumentIds.has(doc.document_id)
  })
  const allRequiredViewed = unviewedRequiredDocs.length === 0

  // For the progress bar / decision badge: count docs that WILL be approved after
  // finalization (uploaded + not flagged for rejection by admin in this session).
  const willApproveCount = verificationDocuments.filter((doc) => !isRejected(doc)).length
  const totalUploaded = verificationDocuments.length

  // Progress shows "will approve" out of total uploaded
  const approvalPct = totalUploaded ? Math.round((willApproveCount / totalUploaded) * 100) : 0

  const hasRejectedRequired = requiredDocuments.some((type) => {
    const doc = verificationDocuments.find((d) => d.document_type === type)
    return doc && isRejected(doc)
  })
  const hasMissingRequired = missingDocuments.length > 0
  const willReject = hasRejectedRequired || hasMissingRequired
  const rejectedCount = Object.keys(decisions).length

  return (
    <>
      <div className="-mx-4 -mt-8 bg-slate-50 pb-12 sm:-mx-6">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <button onClick={() => navigate('/admin/employers')} className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" />
          Back to directory
        </button>

        {error && <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}
        {notice && <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" />{notice}</div>}

        <div className="mb-4 space-y-4">
          {/* Hero Banner Section */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="h-32 bg-gradient-to-r from-brand-navy to-blue-700 sm:h-48" />
            <div className="relative px-5 pb-6 sm:px-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="relative -mt-10 shrink-0 sm:-mt-12">
                    <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg sm:h-32 sm:w-32">
                      {companyProfile.company_logo_url ? (
                        <img src={companyProfile.company_logo_url} alt="Logo" className="h-full w-full object-contain p-2" />
                      ) : (
                        <Building2 className="h-10 w-10 text-slate-300 sm:h-12 sm:w-12" />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 pt-1 sm:pt-4">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600 mb-1">
                      {verificationStatus === 'pending' ? 'PESO Employer Audit Hub' : 'Employer Profile'}
                    </p>
                    <div className="flex items-center gap-2">
                      <h1 className="truncate text-2xl font-black text-slate-950 sm:text-3xl">{companyProfile.company_name || employer.company_name}</h1>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 lg:justify-end lg:pl-4">
                  <Badge status={verificationStatus === 'approved' ? 'approved' : verificationStatus === 'rejected' ? 'rejected' : 'pending'}>{formatValue(verificationStatus)}</Badge>
                </div>
              </div>
            </div>
          </div>
          {/* Main Content and Sidebar Layout */}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
            <main className="space-y-6">
              <Card>
                <CardHeader title="Company Details" subtitle="Core business information registered in the system." />
                <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  <InfoItem label="Company name" value={companyProfile.company_name || employer.company_name} />
                  <InfoItem label="Industry" value={companyProfile.industry || employer.industry} />
                  <InfoItem label="TIN" value={companyProfile.tin || employer.tin} />
                  <InfoItem label="Business address" value={companyProfile.business_address || businessAddress.complete_address} />
                </div>
              </Card>

              <Card>
                <CardHeader title="Representative" subtitle="Authorized contact person for PESO coordination." />
                <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  <InfoItem label="Name" value={representative.representative_name || `${representative.representative_first_name || ''} ${representative.representative_last_name || ''}`.trim()} />
                  <InfoItem label="Designation" value={representative.representative_designation} />
                  <InfoItem label="Contact number" value={representative.representative_contact_number || representative.mobile_number} />
                  <InfoItem label="Email address" value={representative.email} />
                </div>
              </Card>

              {/* Job Vacancies List */}
              {verificationStatus !== 'pending' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-black text-slate-900">Active Job Vacancies</h2>
                  {employer.active_vacancies?.length > 0 ? (
                    <div className="grid gap-4">
                      {employer.active_vacancies.map(job => (
                        <div key={job.post_id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-brand-navy hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="text-base font-bold text-slate-900">{job.job_title}</h3>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                              <span className="flex items-center gap-1"><BriefcaseBusiness className="h-3 w-3 capitalize" />{job.employment_type?.replaceAll('_', ' ')}</span>
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Posted {formatDate(job.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Card className="text-center">
                      <BriefcaseBusiness className="mx-auto h-12 w-12 text-slate-300" />
                      <p className="mt-2 text-sm font-medium text-slate-600">No active job vacancies.</p>
                    </Card>
                  )}
                </div>
              )}

              <Card padding="none">
                <button
                  type="button"
                  onClick={() => setDocumentsExpanded((current) => !current)}
                  aria-expanded={documentsExpanded}
                  className="flex w-full items-center justify-between gap-3 p-5 pb-3 text-left transition hover:bg-slate-50 sm:p-6 sm:pb-4"
                >
                  <div>
                    <h2 className="text-lg font-black text-slate-950">Verification documents</h2>
                    {verificationStatus === 'pending' && (
                      <p className="mt-1 text-sm text-slate-500">Review each document. Documents will be approved unless you flag them for rejection before finalizing.</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge status={totalUploaded ? 'active' : 'warning'}>{totalUploaded ? `${totalUploaded} uploaded` : 'No documents'}</Badge>
                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${documentsExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {documentsExpanded && (
                  <>
                {/* Approval progress bar */}
                {verificationStatus === 'pending' && requiredCount > 0 && (
                  <div className="px-6 mt-4">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                      <span>Approval progress</span>
                      <span>{approvalPct}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(approvalPct, 2)}%`,
                          background: willReject
                            ? 'linear-gradient(90deg, #ef4444, #f97316)'
                            : 'linear-gradient(90deg, #10b981, #059669)',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Landscape (table) layout of the requirements */}
                <div className="px-6 pb-6 mt-5 overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                        <th className="px-3 py-2">Document</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Expiration</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documentRows.map((row) => {
                        const doc = row.document
                        const label = DOCUMENT_LABELS[row.type] ?? row.type
                        const rejected = isRejected(doc)
                        return (
                          <tr key={`${row.type}-${doc?.document_id ?? 'missing'}`} className="border-b border-slate-100 align-top">
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{label}</span>
                                {row.required && <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-600">Required</span>}
                              </div>
                              {doc ? (
                                <p className="mt-1 text-xs text-slate-400">{doc.original_filename} · Uploaded {formatDate(doc.uploaded_at || doc.created_at)}</p>
                              ) : (
                                <p className="mt-1 text-xs text-amber-600">No file submitted</p>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {!doc ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />Not submitted</span>
                              ) : rejected ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700"><XCircle className="h-3.5 w-3.5" />Flagged for rejection</span>
                                  <p className="mt-1 text-xs text-red-600">{decisions[doc.document_id]}</p>
                                </div>
                              ) : doc.verification_status === 'approved' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Approved</span>
                              ) : (
                                <div className="flex flex-col items-start gap-1">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />Pending review</span>
                                  {(doc.viewed_at || viewedDocumentIds.has(doc.document_id)) && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700"><Eye className="h-3 w-3" />Viewed</span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-2 text-xs text-slate-600">
                              {row.type === 'mayors_permit' ? (
                                doc?.expiration_date ? (
                                  <div className="flex flex-col items-start gap-1">
                                    <span>{formatDate(doc.expiration_date)}</span>
                                    {new Date(doc.expiration_date) < new Date() && (
                                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">Expired</span>
                                    )}
                                  </div>
                                ) : '—'
                              ) : '—'}
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                {doc && (
                                  <>
                                    <Button variant="outline" size="sm" icon={Eye} onClick={() => viewDocument(doc)} disabled={viewingDocumentId === doc.document_id}>
                                      {viewingDocumentId === doc.document_id ? 'Loading...' : 'View'}
                                    </Button>
                                    <Button variant="outline" size="sm" icon={Download} onClick={() => { setDownloadDocument(doc); setDownloadReason('') }}>
                                      <span className="hidden xl:inline">Download</span>
                                    </Button>
                                    {verificationStatus === 'pending' && (
                                      rejected ? (
                                        <Button variant="outline" size="sm" icon={CheckCircle2} onClick={() => undoRejectRow(doc.document_id)}>Undo</Button>
                                      ) : (
                                        <select
                                          value=""
                                          onChange={(event) => { if (event.target.value) rejectRow(doc.document_id, event.target.value) }}
                                          className="w-28 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-bold text-red-700 focus:outline-none focus:ring-1 focus:ring-red-300"
                                        >
                                          <option value="">Reject…</option>
                                          {REJECTION_REASONS.map((reason) => <option key={reason} title={reason} value={reason}>{reason}</option>)}
                                        </select>
                                      )
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {documentRows.length === 0 && (
                    <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">No documents have been uploaded for this employer.</div>
                  )}
                </div>

                {/* Form Action Footer */}
                {verificationStatus === 'pending' && (
                  <div className="mt-2 mx-6 mb-6 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-5 md:flex-row">
                    <Button variant="ghost" onClick={() => navigate('/admin/employers')} icon={ArrowLeft}>Back to Queue</Button>
                    
                    {missingDocuments.length > 0 ? (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-red-600">Missing {missingDocuments.length} required document(s)</span>
                        <Button onClick={handleFinalize} icon={XCircle} disabled={actionLoading}>{actionLoading ? 'Loading...' : 'Reject Accreditation'}</Button>
                      </div>
                    ) : !allRequiredViewed ? (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-amber-600">View all required documents first</span>
                        <Button onClick={() => {}} icon={CheckCircle2} disabled>Complete Review</Button>
                      </div>
                    ) : (
                      <Button onClick={handleFinalize} icon={CheckCircle2} disabled={actionLoading}>{actionLoading ? 'Loading...' : 'Complete Review'}</Button>
                    )}
                  </div>
                )}
                  </>
                )}
              </Card>
            </main>

            <aside className="space-y-6">
              <Card>
                <CardHeader title="Operational Review" subtitle="Verification status and updates." />
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <span className={`rounded-lg p-2 ${verificationStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}><ShieldCheck className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500">Status</p>
                      <p className="text-sm font-bold text-slate-800 capitalize">{formatValue(verificationStatus)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <span className="rounded-lg bg-slate-200 p-2 text-slate-700"><Clock className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500">Last updated</p>
                      <p className="text-sm font-bold text-slate-800">{formatDate(employer.updated_at)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <p className="text-xs text-slate-500">Remarks</p>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-800 pl-6">{verificationRemarks || 'No remarks recorded'}</p>
                  </div>
                </div>
              </Card>

              {/* Extra Profile Sections for Verified Employers */}
              {verificationStatus !== 'pending' && (
                <>
                  <Card>
                    <CardHeader title="Data Quality Flags" subtitle="Operational indicators for follow-up." />
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(dataQualityFlags || {}).filter(([, value]) => value).map(([key]) => <Badge key={key} status="warning">{key.replace(/_/g, ' ')}</Badge>)}
                      {!Object.values(dataQualityFlags || {}).some(Boolean) && <span className="text-sm text-slate-500">No flags detected.</span>}
                    </div>
                  </Card>

                  <Card>
                    <CardHeader title="Job Fair Participation" subtitle="Events the employer joined." />
                    {jobFairParticipation?.length ? (
                      <div className="space-y-2">
                        {jobFairParticipation.map((fair) => <div key={fair.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-sm font-bold text-slate-800">{fair.name}</p><p className="mt-1 text-xs text-slate-500">{formatDate(fair.date)}</p></div>)}
                      </div>
                    ) : <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center"><p className="text-sm text-slate-500">No job fair participation records.</p></div>}
                  </Card>
                </>
              )}
            </aside>
          </div>
        </div>  </div>
      </div>

      {/* ── DOWNLOAD MODAL ───────────────────────────────────────── */}
      {downloadDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm" onClick={() => { setDownloadDocument(null); setDownloadReason('') }}>
          <div className="mx-4 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-blue-50 p-3 text-blue-700"><Download className="h-6 w-6" /></span>
              <div>
                <h3 className="text-lg font-black text-slate-950">Download Document</h3>
                <p className="text-sm text-slate-500">{DOCUMENT_LABELS[downloadDocument.document_type] ?? downloadDocument.document_type}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">{downloadDocument.original_filename}</p>
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                The downloaded file is the original without any watermarks
              </p>
              <p className="mt-1 text-xs text-emerald-700/80">This download is audit-logged for compliance purposes.</p>
            </div>
            <label className="mt-4 block text-sm text-slate-600">
              <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-400">Official download purpose</span>
              <input value={downloadReason} onChange={(event) => setDownloadReason(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" placeholder="State the reason for secure download (min 10 characters)" />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setDownloadDocument(null); setDownloadReason('') }}>Cancel</Button>
              <Button variant="secondary" icon={Download} onClick={confirmDownload} disabled={downloading}>{downloading ? 'Downloading...' : 'Download file'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── DOCUMENT PREVIEW WITH WATERMARK ──────────────────────── */}
      {previewDocument && (
        <WatermarkedPreview
          previewDocument={previewDocument}
          documentLabels={DOCUMENT_LABELS}
          onClose={closePreview}
        />
      )}

      {/* ── CONFIRMATION DIALOG ───────────────────────────────────── */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm" onClick={() => setConfirmDialog(null)}>
          <div className="mx-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className={`rounded-xl p-3 ${confirmDialog.variant === 'approve' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {confirmDialog.variant === 'approve' ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
              </span>
              <h3 className="text-lg font-black text-slate-950">{confirmDialog.title}</h3>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{confirmDialog.message}</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDialog(null)}>Cancel</Button>
              <Button
                variant={confirmDialog.variant === 'approve' ? 'secondary' : 'danger'}
                onClick={confirmDialog.onConfirm}
                disabled={actionLoading}
                className={confirmDialog.variant === 'approve' ? '!border-emerald-600 !bg-emerald-600 !text-white hover:!bg-emerald-700' : ''}
              >
                {actionLoading ? 'Processing...' : confirmDialog.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value ? formatValue(value) : 'Not provided'}</p>
    </div>
  )
}

function StatTile({ label, value }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xl font-black text-slate-950">{value}</p><p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}</p></div>
}

function ReadinessCheck({ label, passed, detail }) {
  return (
    <div className="flex items-center gap-2">
      {passed
        ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        : <XCircle className="h-4 w-4 shrink-0 text-red-500" />
      }
      <span className={`text-sm font-semibold ${passed ? 'text-emerald-800' : 'text-red-700'}`}>{label}</span>
      {detail && <span className="text-xs text-slate-400">({detail})</span>}
    </div>
  )
}

function labelForFlag(key) {
  const labels = {
    missing_business_address: 'Missing business address',
    missing_gps: 'Missing GPS',
    missing_documents: 'Missing documents',
    no_active_vacancies: 'No active vacancies',
    no_representative_contact: 'No representative contact',
    rejected_documents: 'Rejected documents',
  }
  return labels[key] ?? key.replaceAll('_', ' ')
}

function WatermarkedPreview({ previewDocument, documentLabels, onClose }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    // Block keyboard shortcuts like Ctrl+S, Ctrl+P while preview is open
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p')) {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!previewDocument || !previewDocument.mimeType?.startsWith('image/')) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height

      // Draw original image
      ctx.drawImage(img, 0, 0)

      // Burn watermark
      ctx.save()
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(-35 * Math.PI / 180)

      // Center watermark
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // Large text
      ctx.font = '900 72px sans-serif'
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'
      ctx.fillText('CONFIDENTIAL', 0, -40)

      // Sub text
      ctx.font = '700 28px sans-serif'
      ctx.fillStyle = 'rgba(239, 68, 68, 0.12)'
      ctx.fillText('PESO REVIEW ONLY — DO NOT DISTRIBUTE', 0, 20)

      // Timestamp
      ctx.font = '600 22px sans-serif'
      ctx.fillStyle = 'rgba(239, 68, 68, 0.10)'
      ctx.fillText(new Date().toLocaleString('en-PH'), 0, 60)

      // Repeating pattern
      ctx.font = '900 36px sans-serif'
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'
      const stepX = 400
      const stepY = 200
      for (let x = -canvas.width * 2; x < canvas.width * 2; x += stepX) {
        for (let y = -canvas.height * 2; y < canvas.height * 2; y += stepY) {
          // Skip center area
          if (Math.abs(x) < 300 && Math.abs(y) < 200) continue
          ctx.fillText('CONFIDENTIAL — PESO REVIEW ONLY', x, y)
        }
      }

      ctx.restore()
    }
    img.src = previewDocument.url
  }, [previewDocument])

  const label = documentLabels[previewDocument.document_type] ?? previewDocument.document_type
  const isImage = previewDocument.mimeType?.startsWith('image/')

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-sm" onContextMenu={(e) => e.preventDefault()}>
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-6 py-4 text-white">
        <div>
          <p className="text-lg font-bold">{label}</p>
          <p className="text-sm text-slate-400">{previewDocument.original_filename}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400">
            WATERMARKED PREVIEW
          </span>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/20 px-4 py-2 text-sm font-bold transition-colors hover:bg-white/10">Close Preview</button>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden p-6 flex items-center justify-center">
        {isImage ? (
          <div className="relative h-full w-full overflow-hidden rounded-xl bg-slate-800 shadow-2xl ring-1 ring-white/10 flex items-center justify-center">
            {/* Using a canvas means right-click "Save Image As" downloads the burned-in watermark version! */}
             <canvas 
                ref={canvasRef} 
                className="max-h-full max-w-full object-contain select-none"
                style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                title="Watermarked preview"
             />
          </div>
        ) : (
          <div className="relative h-full w-full overflow-hidden rounded-xl bg-slate-800 shadow-2xl ring-1 ring-white/10">
            <iframe 
              title={previewDocument.original_filename} 
              src={`${previewDocument.url}#toolbar=0&navpanes=0`} 
              className="h-full w-full border-0 bg-white" 
            />
            {/* Watermark overlay just for display over PDF */}
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
              <div className="absolute inset-[-50%] flex flex-wrap items-center justify-center gap-0" style={{ transform: 'rotate(-35deg)' }}>
                {Array.from({ length: 48 }).map((_, i) => (
                  <div key={i} className="whitespace-nowrap px-8 py-12 text-center" style={{ fontSize: '18px', fontWeight: 900, color: 'rgba(0, 0, 0, 0.08)', letterSpacing: '0.15em', textTransform: 'uppercase', textShadow: '0 0 8px rgba(0,0,0,0.03)' }}>
                    CONFIDENTIAL — PESO REVIEW ONLY
                  </div>
                ))}
              </div>
              <div className="absolute flex flex-col items-center gap-2" style={{ transform: 'rotate(-35deg)' }}>
                <div style={{ fontSize: '36px', fontWeight: 900, color: 'rgba(239, 68, 68, 0.15)', letterSpacing: '0.2em', textTransform: 'uppercase', textShadow: '0 2px 12px rgba(239, 68, 68, 0.08)' }}>CONFIDENTIAL</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(239, 68, 68, 0.12)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>PESO REVIEW ONLY — DO NOT DISTRIBUTE</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(239, 68, 68, 0.10)', marginTop: '4px' }}>{new Date().toLocaleString('en-PH')}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
