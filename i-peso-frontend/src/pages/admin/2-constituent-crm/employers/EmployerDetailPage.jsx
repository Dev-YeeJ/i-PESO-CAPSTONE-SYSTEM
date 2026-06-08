import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '@/pages/admin/_components/PageHeader'
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

  if (loading) return <div className="py-8 text-center">Loading employer review...</div>
  if (!review) return <div className="py-8 text-center text-red-600">{error || 'Employer not found'}</div>

  const { employer, documents, required_documents: requiredDocuments, uploaded_documents: uploadedDocuments } = review
  const missingDocuments = requiredDocuments.filter((type) => !uploadedDocuments.includes(type))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title={employer.company_name || 'Employer Review'} subtitle="Employer accreditation review" />
        <button onClick={() => navigate('/admin/employers')} className="text-sm font-medium text-slate-600">
          Back
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Company Information</h2>
          <StatusBadge status={employer.verification_status} />
        </div>
        <div className="grid gap-4 text-sm md:grid-cols-2">
          <Info label="Legal company name" value={employer.company_name} />
          <Info label="Trade name" value={employer.trade_name} />
          <Info label="Company type" value={employer.company_type?.replaceAll('_', ' ')} />
          <Info label="Industry" value={employer.industry} />
          <Info label="Company size" value={employer.company_size} />
          <Info label="Email" value={employer.email} />
          <Info label="Address" value={employer.complete_address} />
          <Info
            label="Representative"
            value={[employer.representative_first_name, employer.representative_middle_name, employer.representative_last_name].filter(Boolean).join(' ')}
          />
          <Info label="Designation" value={employer.representative_designation} />
          <Info label="Contact number" value={employer.representative_contact_number} />
        </div>
        {employer.company_description && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Company description</p>
            <p className="mt-1 text-sm text-slate-800">{employer.company_description}</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-bold text-slate-900">Submitted Documents</h2>
        {missingDocuments.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Missing: {missingDocuments.map((type) => DOCUMENT_LABELS[type] ?? type).join(', ')}
          </div>
        )}
        <div className="space-y-3">
          {documents.map((document) => (
            <div key={document.document_id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                <p className="font-semibold text-slate-900">{DOCUMENT_LABELS[document.document_type] ?? document.document_type}</p>
                <p className="text-xs text-slate-500">{document.original_filename}</p>
                {document.admin_notes && <p className="mt-1 text-xs text-red-600">{document.admin_notes}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={document.verification_status} />
                  <button
                    type="button"
                    disabled={viewingDocumentId === document.document_id}
                    onClick={() => viewDocument(document)}
                    className="text-sm font-semibold text-blue-700 disabled:text-slate-400"
                  >
                    {viewingDocumentId === document.document_id ? 'Opening...' : 'View'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDownloadDocument(document)
                      setDownloadReason('')
                    }}
                    className="text-sm font-semibold text-slate-700"
                  >
                    Download
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row">
                <input
                  value={documentNotes[document.document_id] ?? ''}
                  onChange={(event) => setDocumentNotes((current) => ({
                    ...current,
                    [document.document_id]: event.target.value,
                  }))}
                  placeholder="Admin notes (required when rejecting)"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={reviewingDocumentId === document.document_id}
                  onClick={() => reviewDocument(document, 'rejected')}
                  className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                >
                  Reject Document
                </button>
                <button
                  type="button"
                  disabled={reviewingDocumentId === document.document_id}
                  onClick={() => reviewDocument(document, 'approved')}
                  className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Approve Document
                </button>
              </div>
            </div>
          ))}
          {documents.length === 0 && <p className="text-sm text-slate-500">No documents uploaded.</p>}
        </div>
      </section>

      {previewDocument && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95">
          <div className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-3 text-white">
            <div>
              <p className="font-semibold">{DOCUMENT_LABELS[previewDocument.document_type] ?? previewDocument.document_type}</p>
              <p className="text-xs text-slate-300">{previewDocument.original_filename}</p>
            </div>
            <button
              type="button"
              onClick={closePreview}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-semibold hover:bg-white/10"
            >
              Close Preview
            </button>
          </div>

          <div
            className="relative flex-1 overflow-hidden p-4"
            onContextMenu={(event) => event.preventDefault()}
          >
            <div className="relative h-full overflow-hidden rounded-xl bg-slate-800">
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
                    <div className="-rotate-12 whitespace-nowrap text-center text-sm font-bold uppercase tracking-wider text-red-600/25">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Download confidential document</h2>
            <p className="mt-2 text-sm text-slate-600">
              State the official PESO purpose for downloading {downloadDocument.original_filename}.
              This action will be recorded in the activity log.
            </p>
            <textarea
              value={downloadReason}
              onChange={(event) => setDownloadReason(event.target.value)}
              placeholder="Example: Required for employer accreditation record review"
              rows={4}
              className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                disabled={downloading}
                onClick={() => {
                  setDownloadDocument(null)
                  setDownloadReason('')
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={downloading}
                onClick={confirmDownload}
                className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {downloading ? 'Downloading...' : 'Confirm Download'}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold text-slate-900">Admin Decision</h2>
        <p className="mt-1 text-sm text-slate-500">
          All required documents must be approved. The employer will receive an email and an in-app notification after the final decision.
        </p>
        <textarea
          value={approvalRemarks}
          onChange={(event) => setApprovalRemarks(event.target.value)}
          placeholder="Optional approval remarks included in the employer email"
          rows={2}
          className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <textarea
          value={rejectionReason}
          onChange={(event) => setRejectionReason(event.target.value)}
          placeholder="Reason required when rejecting (minimum 10 characters)"
          rows={3}
          className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            disabled={actionLoading}
            onClick={reject}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            disabled={
              actionLoading
              || missingDocuments.length > 0
              || requiredDocuments.some((type) => (
                documents.find((document) => document.document_type === type)?.verification_status !== 'approved'
              ))
            }
            onClick={approve}
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Approve Employer
          </button>
        </div>
      </section>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold capitalize text-slate-900">{value || 'Not provided'}</p>
    </div>
  )
}
