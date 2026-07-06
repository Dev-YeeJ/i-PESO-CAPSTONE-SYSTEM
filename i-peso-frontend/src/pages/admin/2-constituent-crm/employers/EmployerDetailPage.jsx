import { createElement, useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Building2, CheckCircle2, Download, Eye, FileText, MapPin, ShieldAlert, XCircle } from 'lucide-react'
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
    }
  }

  const reject = async () => {
    if (rejectionReason.trim().length < 10) {
      setError('Provide a rejection reason of at least 10 characters.')
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
    }
  }

  const reviewDocument = async (document, verificationStatus) => {
    const notes = documentNotes[document.document_id]?.trim() || null

    if (verificationStatus === 'rejected' && (!notes || notes.length < 10)) {
      setError('Enter document notes of at least 10 characters before rejecting a document.')
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
                  <p className="mt-1 text-sm text-slate-500">Only metadata is displayed; private file URLs remain protected.</p>
                </div>
                <Badge status={verificationDocuments.length ? 'active' : 'warning'}>{verificationDocuments.length ? `${verificationDocuments.length} uploaded` : 'No documents'}</Badge>
              </div>
              {verificationDocuments.length ? (
                <div className="mt-5 space-y-3">
                  {verificationDocuments.map((document) => (
                    <div key={document.document_id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">{DOCUMENT_LABELS[document.document_type] ?? document.document_type}</p>
                          <p className="mt-1 text-sm text-slate-500">{document.original_filename}</p>
                          <p className="mt-1 text-xs text-slate-400">Uploaded {formatDate(document.uploaded_at || document.created_at)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge status={document.verification_status ?? 'pending'} />
                          <Button variant="outline" size="sm" icon={Eye} onClick={() => viewDocument(document)}>View</Button>
                          <Button variant="outline" size="sm" icon={Download} onClick={() => { setDownloadDocument(document); setDownloadReason('') }}>Download</Button>
                        </div>
                      </div>
                      <input value={documentNotes[document.document_id] ?? ''} onChange={(event) => setDocumentNotes((current) => ({ ...current, [document.document_id]: event.target.value }))} placeholder="Add note for review" className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="danger" size="sm" icon={XCircle} onClick={() => reviewDocument(document, 'rejected')} disabled={reviewingDocumentId === document.document_id}>Reject</Button>
                        <Button variant="secondary" size="sm" icon={CheckCircle2} onClick={() => reviewDocument(document, 'approved')} disabled={reviewingDocumentId === document.document_id}>Approve</Button>
                      </div>
                    </div>
                  ))}
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
              <div className="mt-4 space-y-3">
                <label className="block text-sm text-slate-600"><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-400">Approval remarks</span><textarea value={approvalRemarks} onChange={(event) => setApprovalRemarks(event.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-navy" placeholder="Optional admin remarks" /></label>
                <label className="block text-sm text-slate-600"><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-400">Rejection reason</span><textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-navy" placeholder="Required for rejection" /></label>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={approve} disabled={actionLoading}>{actionLoading ? 'Working...' : 'Approve employer'}</Button>
                  <Button variant="danger" onClick={reject} disabled={actionLoading}>Reject employer</Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {downloadDocument && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex-1 text-sm text-slate-600"><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-400">Official download purpose</span><input value={downloadReason} onChange={(event) => setDownloadReason(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="State the reason for secure download" /></label>
              <Button variant="secondary" onClick={confirmDownload} disabled={downloading}>{downloading ? 'Downloading...' : 'Download file'}</Button>
              <Button variant="ghost" onClick={() => { setDownloadDocument(null); setDownloadReason('') }}>Cancel</Button>
            </div>
          </div>
        )}
      </div>

      {previewDocument && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-6 py-4 text-white">
            <div>
              <p className="text-lg font-bold">{DOCUMENT_LABELS[previewDocument.document_type] ?? previewDocument.document_type}</p>
              <p className="text-sm text-slate-400">{previewDocument.original_filename}</p>
            </div>
            <button type="button" onClick={closePreview} className="rounded-lg border border-white/20 px-4 py-2 text-sm font-bold transition-colors hover:bg-white/10">Close Preview</button>
          </div>
          <div className="relative flex-1 overflow-hidden p-6" onContextMenu={(event) => event.preventDefault()}>
            <div className="relative h-full overflow-hidden rounded-xl bg-slate-800 shadow-2xl ring-1 ring-white/10">
              {previewDocument.mimeType?.startsWith('image/') ? (
                <img src={previewDocument.url} alt={previewDocument.original_filename} draggable={false} className="h-full w-full select-none object-contain" />
              ) : (
                <iframe title={previewDocument.original_filename} src={`${previewDocument.url}#toolbar=0&navpanes=0`} className="h-full w-full border-0 bg-white" />
              )}
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
