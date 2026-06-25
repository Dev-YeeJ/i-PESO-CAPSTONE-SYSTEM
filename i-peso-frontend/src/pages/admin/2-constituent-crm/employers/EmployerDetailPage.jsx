import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, XCircle, AlertTriangle, Building2, MapPin, Briefcase, Eye, Download, ShieldAlert, ArrowLeft, Mail, FileText } from 'lucide-react'
import { Card, Button } from '@/components/ui'
import StatusBadge from '@/pages/admin/_components/StatusBadge'
import { adminService } from '@/services/adminService'
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

export default function EmployerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const admin = useAuthStore((state) => state.user)
  const [review, setReview] = useState(null)
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

  const loadReview = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setReview(await adminService.getEmployerReview(id))
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? requestError.response?.data?.error ?? 'Unable to load employer review.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadReview()
  }, [loadReview])

  useEffect(() => () => {
    if (previewDocument?.url) URL.revokeObjectURL(previewDocument.url)
  }, [previewDocument])

  const approve = async () => {
    setActionLoading(true)
    setError('')
    setNotice('')
    try {
      const result = await adminService.approveEmployer(id, approvalRemarks.trim() || null)
      setNotice(
        result.notification_queued
          ? 'Employer approved. Email and dashboard notifications were queued for delivery.'
          : 'Employer approved, but notifications could not be queued. Check the mail and queue configuration.',
      )
      setApprovalRemarks('')
      await loadReview()
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
      setNotice(
        result.notification_queued
          ? 'Employer rejected. Email and dashboard notifications with the reason were queued for delivery.'
          : 'Employer rejected, but notifications could not be queued. Check the mail and queue configuration.',
      )
      setRejectionReason('')
      await loadReview()
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
      setNotice(
        result.notification_queued
          ? `${DOCUMENT_LABELS[document.document_type] ?? document.document_type} marked as ${verificationStatus}. The employer was notified.`
          : `${DOCUMENT_LABELS[document.document_type] ?? document.document_type} marked as ${verificationStatus}, but the notification could not be queued.`,
      )
      setDocumentNotes((current) => ({ ...current, [document.document_id]: '' }))
      await loadReview()
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
      setPreviewDocument({
        ...document,
        url: fileUrl,
        mimeType: file.type,
        viewedAt: new Date(),
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
      const response = await adminService.downloadEmployerDocument(
        downloadDocument.document_id,
        downloadReason.trim(),
      )
      const fileUrl = URL.createObjectURL(response.data)
      const link = window.document.createElement('a')
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
  if (!review) return <div className="py-12 text-center text-red-600 font-medium">{error || 'Employer not found'}</div>

  const { employer, documents, required_documents: requiredDocuments, uploaded_documents: uploadedDocuments } = review
  const missingDocuments = requiredDocuments.filter((type) => !uploadedDocuments.includes(type))
  const allDocsApproved = missingDocuments.length === 0 && requiredDocuments.every((type) => (
    documents.find((document) => document.document_type === type)?.verification_status === 'approved'
  ))

  return (
    <div className="-mx-4 -mt-8 bg-slate-50 pb-12 sm:-mx-6">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => navigate('/admin/employers')} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Directory
          </button>
        </div>

        {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0"/> {error}</div>}
        {notice && <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0"/> {notice}</div>}

        <div className="grid lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)] gap-6">
          
          {/* Main Left Content */}
          <div className="space-y-6">
            
            {/* Hero Section */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="relative h-44 bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.35),_transparent_32%),linear-gradient(135deg,_#0f172a,_#1d4ed8_58%,_#38bdf8)] sm:h-56">
                <div className="absolute inset-0 bg-[linear-gradient(120deg,_rgba(255,255,255,0.16)_0,_rgba(255,255,255,0)_45%)]" />
                <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-end justify-between gap-3 text-white">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-100">PESO Employer Audit Hub</p>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-blue-50">A comprehensive accreditation review for business legitimacy and DOLE compliance.</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur">
                    <span className={`h-2.5 w-2.5 rounded-full ${employer.verification_status === 'approved' ? 'bg-emerald-300' : 'bg-amber-300'}`} />
                    {employer.verification_status === 'approved' ? 'Fully Accredited' : 'Pending Verification'}
                  </span>
                </div>
              </div>
              
              <div className="px-5 pb-6 sm:px-7">
                <div className="-mt-16 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                    <div className="relative shrink-0">
                      <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-blue-100 text-3xl font-black text-blue-800 shadow-xl">
                        {employer.logo_url ? (
                          <img src={employer.logo_url} alt={employer.company_name} className="h-full w-full object-cover" />
                        ) : (
                          employer.company_name?.charAt(0) || '?'
                        )}
                      </div>
                    </div>
                    
                    <div className="min-w-0 pb-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-3xl font-black tracking-tight text-slate-950">{employer.company_name}</h1>
                        <StatusBadge status={employer.verification_status} size="sm" />
                      </div>
                      <p className="mt-2 text-base font-semibold text-slate-700 capitalize">{employer.company_type?.replaceAll('_', ' ') || 'Direct Employer'}</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                        <span className="flex items-center gap-1.5 font-medium"><MapPin className="h-4 w-4 text-slate-400"/> {employer.city_municipality || employer.complete_address || 'Location unspecified'}</span>
                        <span className="flex items-center gap-1.5 font-medium"><Building2 className="h-4 w-4 text-slate-400"/> {employer.industry || 'Industry unspecified'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin Quick Stats */}
                <div className="mt-6 grid gap-3 sm:grid-cols-4">
                  <Stat icon={FileText} label="Documents" value={employer.documents_count || 0} tone="blue" />
                  <Stat icon={Building2} label="Size" value={employer.company_size || 'Unknown'} tone="indigo" />
                  <Stat icon={Briefcase} label="Vacancies" value={employer.active_vacancies || 0} tone="emerald" />
                  <Stat icon={CheckCircle2} label="Hired" value={employer.total_hired || 0} tone="blue" />
                </div>
              </div>
            </section>

          {/* Verification Vault */}
          <Card padding="none" className="bg-white shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-brand-600" />
                  Verification Vault
                </h2>
                <p className="text-sm text-slate-500 mt-1">Audit submitted legal documents to verify business legitimacy.</p>
              </div>
            </div>
            
            <div className="p-5 sm:p-6 space-y-4">
              {missingDocuments.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <p className="font-bold">Missing Required Documents</p>
                    <p className="mt-1 opacity-90">{missingDocuments.map((type) => DOCUMENT_LABELS[type] ?? type).join(', ')}</p>
                  </div>
                </div>
              )}

              {documents.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No documents have been uploaded yet.</p>
              ) : (
                <div className="grid gap-4">
                  {documents.map((document) => (
                    <div key={document.document_id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:border-slate-300">
                      <div className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-bold text-slate-900">{DOCUMENT_LABELS[document.document_type] ?? document.document_type}</h3>
                            <StatusBadge status={document.verification_status} size="sm" />
                          </div>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                            <FileText className="h-3 w-3" /> {document.original_filename}
                          </p>
                          {document.admin_notes && (
                            <div className="mt-2 text-xs font-medium bg-slate-50 border border-slate-100 rounded-md p-2 text-slate-700">
                              <span className="text-slate-500 uppercase tracking-wide text-[10px] block mb-0.5">Admin Note</span>
                              {document.admin_notes}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                           <Button 
                              variant="outline" 
                              size="sm"
                              disabled={viewingDocumentId === document.document_id}
                              onClick={() => viewDocument(document)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {viewingDocumentId === document.document_id ? 'Loading...' : 'View'}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setDownloadDocument(document)
                                setDownloadReason('')
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                        </div>
                      </div>
                      
                      {/* Admin Actions Bar for the document */}
                      <div className="bg-slate-50 border-t border-slate-100 p-3 sm:px-4 flex flex-col sm:flex-row gap-3">
                        <input
                          value={documentNotes[document.document_id] ?? ''}
                          onChange={(e) => setDocumentNotes((current) => ({ ...current, [document.document_id]: e.target.value }))}
                          placeholder="Add note (required for rejection)..."
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-0 outline-none"
                        />
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={reviewingDocumentId === document.document_id}
                            onClick={() => reviewDocument(document, 'rejected')}
                          >
                            <XCircle className="h-4 w-4 mr-1.5" /> Reject
                          </Button>
                          <Button
                            variant="success"
                            size="sm"
                            disabled={reviewingDocumentId === document.document_id}
                            onClick={() => reviewDocument(document, 'approved')}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Company Profile & Compliance Data */}
          <Card padding="none" className="bg-white shadow-sm overflow-hidden">
             <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-950">Company Profile & HR Contact</h2>
             </div>
             <div className="p-5 sm:p-6 grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Business Details</h3>
                  <div className="space-y-4">
                    <Info label="Legal Name" value={employer.company_name} />
                    <Info label="Trade Name" value={employer.trade_name} />
                    <Info label="TIN" value={employer.tin} />
                    <Info label="Address" value={employer.complete_address} />
                    <Info label="Description" value={employer.company_description} />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">HR Representative</h3>
                  <div className="space-y-4">
                    <Info label="Name" value={[employer.representative_first_name, employer.representative_middle_name, employer.representative_last_name].filter(Boolean).join(' ')} />
                    <Info label="Designation" value={employer.representative_designation} />
                    <Info label="Email" value={employer.email} />
                    <Info label="Contact Number" value={employer.representative_contact_number} />
                  </div>
                </div>
             </div>
          </Card>

        </div>

        {/* Right Sidebar: Audit & Actions */}
        <div className="xl:col-span-1">
          <div className="sticky top-6">
             <Card className="border-brand-200 shadow-md">
                <div className="flex items-center gap-3 mb-6">
                   <div className="h-10 w-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center">
                     <ShieldAlert className="h-5 w-5" />
                   </div>
                   <div>
                     <h2 className="font-bold text-slate-900">Admin Decision</h2>
                     <p className="text-xs text-slate-500">Final accreditation audit</p>
                   </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 block">Approval Remarks (Optional)</label>
                    <textarea
                      value={approvalRemarks}
                      onChange={(e) => setApprovalRemarks(e.target.value)}
                      placeholder="Included in approval email..."
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-brand-500 focus:bg-white outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 block">Rejection Reason (Required for rejection)</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain what needs to be fixed..."
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-brand-500 focus:bg-white outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-3 pt-6 border-t border-slate-100">
                  <Button
                    variant="success"
                    className="w-full py-3 text-base shadow-sm"
                    disabled={actionLoading || !allDocsApproved}
                    onClick={approve}
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" /> Grant Full DOLE Approval
                  </Button>
                  
                  {!allDocsApproved && (
                    <p className="text-xs text-amber-700 text-center font-medium bg-amber-50 rounded-lg p-2">
                      All required documents must be approved before granting full DOLE accreditation.
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2">
                     <Button
                        variant="danger"
                        disabled={actionLoading}
                        onClick={reject}
                        className="w-full"
                      >
                        <XCircle className="h-4 w-4 mr-1.5" /> Reject
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <AlertTriangle className="h-4 w-4 mr-1.5" /> Suspend
                      </Button>
                  </div>
                  
                  <Button
                    variant="outline"
                    className="w-full"
                  >
                    <Mail className="h-4 w-4 mr-2" /> Send Official Warning
                  </Button>
                </div>
             </Card>
          </div>
        </div>
      </div>

      {/* Modals remain structurally the same but with slightly updated tailwind classes for consistency */}
      {previewDocument && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-6 py-4 text-white">
            <div>
              <p className="font-bold text-lg">{DOCUMENT_LABELS[previewDocument.document_type] ?? previewDocument.document_type}</p>
              <p className="text-sm text-slate-400">{previewDocument.original_filename}</p>
            </div>
            <button
              type="button"
              onClick={closePreview}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-bold hover:bg-white/10 transition-colors"
            >
              Close Preview
            </button>
          </div>

          <div
            className="relative flex-1 overflow-hidden p-6"
            onContextMenu={(event) => event.preventDefault()}
          >
            <div className="relative h-full overflow-hidden rounded-xl bg-slate-800 shadow-2xl ring-1 ring-white/10">
              {previewDocument.mimeType.startsWith('image/') ? (
                <img
                  src={previewDocument.url}
                  alt={previewDocument.original_filename}
                  draggable={false}
                  className="h-full w-full select-none object-contain"
                />
              ) : (
                <iframe
                  title={previewDocument.original_filename}
                  src={`${previewDocument.url}#toolbar=0&navpanes=0`}
                  className="h-full w-full border-0 bg-white"
                />
              )}

              <div className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-4 overflow-hidden">
                {Array.from({ length: 8 }, (_, index) => (
                  <div key={index} className="flex items-center justify-center overflow-hidden">
                    <div className="-rotate-12 whitespace-nowrap text-center text-sm font-black uppercase tracking-wider text-red-500/30">
                      <p>Confidential - PESO Admin</p>
                      <p>{admin?.name || admin?.email || `Admin #${admin?.id}`}</p>
                      <p>Document #{previewDocument.document_id}</p>
                      <p>{previewDocument.viewedAt.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {downloadDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Download className="h-5 w-5 text-brand-600"/> Download Document
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              State the official PESO purpose for downloading <span className="font-semibold text-slate-900">{downloadDocument.original_filename}</span>.
              This action will be securely recorded in the audit log.
            </p>
            <textarea
              value={downloadReason}
              onChange={(event) => setDownloadReason(event.target.value)}
              placeholder="Example: Required for employer accreditation record review"
              rows={4}
              className="mt-4 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:border-brand-500 focus:bg-white outline-none transition-colors"
            />
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                disabled={downloading}
                onClick={() => {
                  setDownloadDocument(null)
                  setDownloadReason('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={downloading}
                onClick={confirmDownload}
              >
                {downloading ? 'Downloading...' : 'Confirm Download'}
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <p className="text-sm font-semibold capitalize text-slate-900">{value || 'Not provided'}</p>
    </div>
  )
}

function Stat({ icon: Icon, label, value, tone = 'blue' }) {
  const tones = {
    blue: 'text-blue-700 bg-blue-50',
    indigo: 'text-indigo-700 bg-indigo-50',
    emerald: 'text-emerald-700 bg-emerald-50',
  }
  
  return (
    <div className="flex flex-col items-center p-4 rounded-xl bg-slate-50/50 border border-slate-100 transition hover:bg-slate-50">
      <div className={`mb-2 rounded-full p-2 ${tones[tone] || tones.blue}`}>
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-xl font-black text-slate-900 leading-none mb-1">{value}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">{label}</span>
    </div>
  )
}

