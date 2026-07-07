import { createElement, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Building2, CheckCircle2, Download, Eye, FileText, MapPin, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import StatusBadge from '@/pages/admin/_components/StatusBadge'
import { adminService } from '@/services/adminService'

const DOCUMENT_LABELS = {
  mayors_permit: "Mayor's Permit",
  bir_certificate: 'BIR Certificate',
  dti_certificate: 'DTI Certificate',
  sec_certificate: 'SEC Certificate',
  prpa_license: 'PRPA License',
  dme_poea_license: 'DMW/POEA License',
  philJobnet_proof: 'PhilJobNet Proof',
}

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
  const [reviewingDocumentId, setReviewingDocumentId] = useState(null)
  const [documentNotes, setDocumentNotes] = useState({})
  const [approvalRemarks, setApprovalRemarks] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState(null)

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

  const approve = async () => {
    setActionLoading(true)
    setError('')
    setNotice('')
    try {
      const result = await adminService.approveEmployer(id, approvalRemarks.trim() || null)
      setNotice(result.notification_queued ? 'Employer approved. Email and dashboard notifications were queued for delivery.' : 'Employer approved, but notifications could not be queued.')
      setApprovalRemarks('')
      await loadEmployer()
    } catch (requestError) {
      setError(requestError.response?.data?.error ?? 'Unable to approve this employer.')
    } finally {
      setActionLoading(false)
      setConfirmDialog(null)
    }
  }

  const reject = async () => {
    if (rejectionReason.trim().length < 10) {
      setError('Provide a rejection reason of at least 10 characters.')
      setConfirmDialog(null)
      return
    }

    setActionLoading(true)
    setError('')
    setNotice('')
    try {
      const result = await adminService.rejectEmployer(id, rejectionReason.trim())
      setNotice(result.notification_queued ? 'Employer rejected. Email and dashboard notifications with the reason were queued for delivery.' : 'Employer rejected, but notifications could not be queued.')
      setRejectionReason('')
      await loadEmployer()
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to reject this employer.')
    } finally {
      setActionLoading(false)
      setConfirmDialog(null)
    }
  }

  const reviewDocument = async (document, verificationStatus) => {
    const notes = documentNotes[document.document_id]?.trim() || null

    if (verificationStatus === 'rejected' && (!notes || notes.length < 10)) {
      setError('Enter document notes of at least 10 characters before rejecting a document.')
      setConfirmDialog(null)
      return
    }

    setReviewingDocumentId(document.document_id)
    setError('')
    setNotice('')

    try {
      const result = await adminService.reviewEmployerDocument(document.document_id, verificationStatus, notes)
      setNotice(result.notification_queued ? `${DOCUMENT_LABELS[document.document_type] ?? document.document_type} marked as ${verificationStatus}.` : `${DOCUMENT_LABELS[document.document_type] ?? document.document_type} marked as ${verificationStatus}.`)
      setDocumentNotes((current) => ({ ...current, [document.document_id]: '' }))
      await loadEmployer()
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to save the document review.')
    } finally {
      setReviewingDocumentId(null)
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

  const handleApproveEmployer = () => {
    // Check if all required docs are approved
    const requiredDocs = Array.isArray(employer?.required_documents) ? employer.required_documents : []
    const uploadedDocs = verificationDocuments
    const unapproved = requiredDocs.filter((type) => {
      const doc = uploadedDocs.find((d) => d.document_type === type)
      return !doc || doc.verification_status !== 'approved'
    })

    if (unapproved.length > 0) {
      setError(`Cannot approve: ${unapproved.length} required document(s) have not been approved yet — ${unapproved.map((t) => DOCUMENT_LABELS[t] ?? t).join(', ')}.`)
      return
    }

    showConfirm({
      title: 'Approve Employer Accreditation',
      message: `You are about to approve "${companyProfile.company_name || employer.company_name}" as a verified PESO employer. This will enable job posting and vacancy management. The employer will receive an email and dashboard notification.`,
      variant: 'approve',
      confirmLabel: 'Confirm Approval',
      onConfirm: approve,
    })
  }

  const handleRejectEmployer = () => {
    if (rejectionReason.trim().length < 10) {
      setError('Provide a rejection reason of at least 10 characters.')
      return
    }

    const activeVacancyCount = activeVacanciesSummary?.total ?? 0
    const warningText = activeVacancyCount > 0
      ? ` WARNING: This employer has ${activeVacancyCount} active vacanc${activeVacancyCount === 1 ? 'y' : 'ies'} that will be automatically closed.`
      : ''

    showConfirm({
      title: 'Reject Employer Accreditation',
      message: `You are about to reject "${companyProfile.company_name || employer.company_name}". Reason: "${rejectionReason.trim()}".${warningText} The employer will receive an email and dashboard notification with the rejection reason.`,
      variant: 'reject',
      confirmLabel: 'Confirm Rejection',
      onConfirm: reject,
    })
  }

  const handleDocumentReview = (document, verificationStatus) => {
    const notes = documentNotes[document.document_id]?.trim() || null
    const docLabel = DOCUMENT_LABELS[document.document_type] ?? document.document_type

    if (verificationStatus === 'rejected' && (!notes || notes.length < 10)) {
      setError('Enter document notes of at least 10 characters before rejecting a document.')
      return
    }

    showConfirm({
      title: `${verificationStatus === 'approved' ? 'Approve' : 'Reject'} Document`,
      message: `You are about to mark "${docLabel}" as ${verificationStatus}.${notes ? ` Notes: "${notes}".` : ''} The employer will be notified of this change.`,
      variant: verificationStatus === 'approved' ? 'approve' : 'reject',
      confirmLabel: `${verificationStatus === 'approved' ? 'Approve' : 'Reject'} Document`,
      onConfirm: () => reviewDocument(document, verificationStatus),
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

  // Document review progress
  const approvedDocsCount = verificationDocuments.filter((d) => d.verification_status === 'approved').length
  const rejectedDocsCount = verificationDocuments.filter((d) => d.verification_status === 'rejected').length
  const allRequiredApproved = requiredDocuments.length > 0 && requiredDocuments.every((type) => {
    const doc = verificationDocuments.find((d) => d.document_type === type)
    return doc && doc.verification_status === 'approved'
  })

  return (
    <div className="-mx-4 -mt-8 bg-slate-50 pb-12 sm:-mx-6">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <button onClick={() => navigate('/admin/employers')} className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" />
          Back to directory
        </button>

        {error && <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}
        {notice && <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" />{notice}</div>}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <div className="space-y-6">
            <Card hero padding="none" heroContent={(
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-100">PESO Employer Audit Hub</p>
                  <h1 className="mt-2 text-3xl font-black text-white">{companyProfile.company_name || employer.company_name || 'Employer profile'}</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">{companyProfile.industry || employer.industry || 'Industry not specified'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge status={verificationStatus === 'approved' ? 'approved' : verificationStatus === 'rejected' ? 'rejected' : 'pending'}>{formatValue(verificationStatus)}</Badge>
                  {companyProfile.gps_status === 'missing' ? <Badge status="warning">Missing GPS</Badge> : <Badge status="active">GPS available</Badge>}
                </div>
              </div>
            )}>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <InfoTile label="Representative" value={representative.representative_name || `${representative.representative_first_name || ''} ${representative.representative_last_name || ''}`.trim() || 'Not provided'} icon={Building2} />
                <InfoTile label="Contact" value={representative.representative_contact_number || representative.mobile_number || 'Not provided'} icon={FileText} />
                <InfoTile label="Business address" value={companyProfile.business_address || businessAddress.complete_address || 'Not provided'} icon={MapPin} />
                <InfoTile label="Verification remarks" value={verificationRemarks || 'No remarks recorded'} icon={ShieldAlert} />
              </div>
            </Card>

            <Card>
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h2 className="text-lg font-black text-slate-950">Company profile</h2>
                  <div className="mt-4 space-y-4">
                    <InfoRow label="Company name" value={companyProfile.company_name || employer.company_name} />
                    <InfoRow label="Company type" value={companyProfile.company_type || employer.company_type} />
                    <InfoRow label="Industry" value={companyProfile.industry || employer.industry} />
                    <InfoRow label="Company size" value={companyProfile.company_size || employer.company_size} />
                    <InfoRow label="Business address" value={companyProfile.business_address || businessAddress.complete_address} />
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-950">Representative information</h2>
                  <div className="mt-4 space-y-4">
                    <InfoRow label="Name" value={representative.representative_name || `${representative.representative_first_name || ''} ${representative.representative_last_name || ''}`.trim()} />
                    <InfoRow label="Designation" value={representative.representative_designation} />
                    <InfoRow label="Email" value={representative.email} />
                    <InfoRow label="Contact number" value={representative.representative_contact_number || representative.mobile_number} />
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">Verification documents</h2>
                  <p className="mt-1 text-sm text-slate-500">Review each document individually before approving the employer.</p>
                </div>
                <div className="flex gap-2">
                  <Badge status={verificationDocuments.length ? 'active' : 'warning'}>{verificationDocuments.length ? `${verificationDocuments.length} uploaded` : 'No documents'}</Badge>
                  {verificationDocuments.length > 0 && (
                    <Badge status={allRequiredApproved ? 'approved' : rejectedDocsCount > 0 ? 'rejected' : 'pending'}>
                      {approvedDocsCount}/{requiredDocuments.length || verificationDocuments.length} approved
                    </Badge>
                  )}
                </div>
              </div>

              {/* Document review progress bar */}
              {verificationDocuments.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                    <span>Review progress</span>
                    <span>{Math.round((approvedDocsCount / (requiredDocuments.length || verificationDocuments.length)) * 100)}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max((approvedDocsCount / (requiredDocuments.length || verificationDocuments.length)) * 100, 2)}%`,
                        background: rejectedDocsCount > 0
                          ? 'linear-gradient(90deg, #ef4444, #f97316)'
                          : allRequiredApproved
                            ? 'linear-gradient(90deg, #10b981, #059669)'
                            : 'linear-gradient(90deg, #f59e0b, #eab308)',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Missing documents warning */}
              {missingDocuments.length > 0 && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-bold">Missing required documents</p>
                    <p className="mt-0.5 text-xs">{missingDocuments.map((t) => DOCUMENT_LABELS[t] ?? t).join(', ')}</p>
                  </div>
                </div>
              )}

              {verificationDocuments.length ? (
                <div className="mt-5 space-y-3">
                  {verificationDocuments.map((document) => {
                    const docStatus = document.verification_status ?? 'pending'
                    const statusStyles = {
                      approved: 'border-l-emerald-500',
                      rejected: 'border-l-red-500',
                      pending: 'border-l-amber-500',
                    }

                    return (
                      <div key={document.document_id} className={`rounded-xl border border-slate-200 border-l-4 p-4 ${statusStyles[docStatus] ?? statusStyles.pending}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900">{DOCUMENT_LABELS[document.document_type] ?? document.document_type}</p>
                              {requiredDocuments.includes(document.document_type) && (
                                <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-600">Required</span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-slate-500">{document.original_filename}</p>
                            <p className="mt-1 text-xs text-slate-400">Uploaded {formatDate(document.uploaded_at || document.created_at)}</p>
                            {document.admin_notes && (
                              <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                <span className="font-bold">Admin notes:</span> {document.admin_notes}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <StatusBadge status={docStatus} />
                            <Button variant="outline" size="sm" icon={Eye} onClick={() => viewDocument(document)} disabled={viewingDocumentId === document.document_id}>
                              {viewingDocumentId === document.document_id ? 'Loading...' : 'View'}
                            </Button>
                            <Button variant="outline" size="sm" icon={Download} onClick={() => { setDownloadDocument(document); setDownloadReason('') }}>Download</Button>
                          </div>
                        </div>
                        <input value={documentNotes[document.document_id] ?? ''} onChange={(event) => setDocumentNotes((current) => ({ ...current, [document.document_id]: event.target.value }))} placeholder="Add note for review (required for rejection, min 10 chars)" className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button variant="danger" size="sm" icon={XCircle} onClick={() => handleDocumentReview(document, 'rejected')} disabled={reviewingDocumentId === document.document_id}>
                            {reviewingDocumentId === document.document_id ? 'Processing...' : 'Reject'}
                          </Button>
                          <Button variant="secondary" size="sm" icon={CheckCircle2} onClick={() => handleDocumentReview(document, 'approved')} disabled={reviewingDocumentId === document.document_id}>
                            {reviewingDocumentId === document.document_id ? 'Processing...' : 'Approve'}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">No documents have been uploaded for this employer.</div>
              )}
            </Card>

            <Card>
              <h2 className="text-lg font-black text-slate-950">Vacancy and application summary</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatTile label="Active vacancies" value={activeVacanciesSummary.total ?? 0} />
                <StatTile label="Closed vacancies" value={closedVacanciesSummary.total ?? 0} />
                <StatTile label="Applications" value={applicationsSummary.total ?? 0} />
                <StatTile label="Hired" value={applicationsSummary.hired_count ?? 0} />
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <h2 className="text-lg font-black text-slate-950">Data quality flags</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(dataQualityFlags).filter(([, value]) => value).map(([key]) => <Badge key={key} status="warning">{labelForFlag(key)}</Badge>)}
                {!Object.keys(dataQualityFlags).filter((key) => dataQualityFlags[key]).length && <p className="text-sm text-slate-500">No flags detected.</p>}
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-black text-slate-950">Operational review</h2>
              <div className="mt-4 space-y-4">
                <InfoRow label="Verification status" value={formatValue(verificationStatus)} />
                <InfoRow label="Remarks" value={verificationRemarks || 'No remarks recorded'} />
                <InfoRow label="Registered" value={formatDate(employer.created_at)} />
                <InfoRow label="Last updated" value={formatDate(employer.updated_at)} />
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-black text-slate-950">Job fair participation</h2>
              {jobFairParticipation.length ? (
                <div className="mt-4 space-y-2">
                  {jobFairParticipation.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">Joined on {formatDate(item.joined_at || item.created_at)}</div>)}
                </div>
              ) : <p className="mt-4 text-sm text-slate-500">No job fair participation records.</p>}
            </Card>

            <Card>
              <h2 className="text-lg font-black text-slate-950">Review decision</h2>

              {/* Guard rail: show readiness checklist */}
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Approval Readiness</p>
                <div className="mt-2 space-y-1.5">
                  <ReadinessCheck
                    label="All required documents uploaded"
                    passed={missingDocuments.length === 0}
                    detail={missingDocuments.length > 0 ? `${missingDocuments.length} missing` : null}
                  />
                  <ReadinessCheck
                    label="All required documents approved"
                    passed={allRequiredApproved}
                    detail={!allRequiredApproved && verificationDocuments.length > 0 ? `${approvedDocsCount}/${requiredDocuments.length || verificationDocuments.length} approved` : null}
                  />
                  <ReadinessCheck
                    label="No rejected documents"
                    passed={rejectedDocsCount === 0}
                    detail={rejectedDocsCount > 0 ? `${rejectedDocsCount} rejected` : null}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <label className="block text-sm text-slate-600"><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-400">Approval remarks</span><textarea value={approvalRemarks} onChange={(event) => setApprovalRemarks(event.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" placeholder="Optional admin remarks" /></label>
                <label className="block text-sm text-slate-600"><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-400">Rejection reason</span><textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy" placeholder="Required for rejection (min 10 characters)" /></label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    icon={ShieldCheck}
                    onClick={handleApproveEmployer}
                    disabled={actionLoading || !allRequiredApproved}
                  >
                    {actionLoading ? 'Working...' : 'Approve employer'}
                  </Button>
                  <Button variant="danger" icon={XCircle} onClick={handleRejectEmployer} disabled={actionLoading}>Reject employer</Button>
                </div>
                {!allRequiredApproved && verificationDocuments.length > 0 && (
                  <p className="text-xs text-amber-700">
                    ⚠ Approval is disabled until all required documents have been individually approved.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
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
              >
                {actionLoading ? 'Processing...' : confirmDialog.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoTile({ icon, label, value }) {
  return <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><div className="flex items-center gap-2 text-sm font-semibold text-white/90"><span className="rounded-lg bg-white/15 p-2">{createElement(icon, { className: 'h-4 w-4' })}</span>{label}</div><p className="mt-3 text-sm text-blue-50">{value}</p></div>
}

function InfoRow({ label, value }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value || 'Not provided'}</p></div>
}

function StatTile({ label, value }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-2xl font-black text-slate-950">{value}</p><p className="mt-1 text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</p></div>
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
