import { createElement, useRef } from 'react'
import { CheckCircle2, Clock3, RotateCcw, ShieldCheck, Upload, XCircle } from 'lucide-react'
import { AlertBox } from '@/components/ui'

const DOCUMENT_LABELS = {
  mayors_permit: "Mayor's Permit",
  bir_certificate: 'BIR Certificate',
  dti_certificate: 'DTI Certificate',
  sec_certificate: 'SEC Certificate',
  prpa_license: 'PRPA License',
  dme_poea_license: 'DMW/POEA License',
  philJobnet_proof: 'PhilJobNet Proof',
}

const STATUS_CONFIG = {
  approved: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Rejected' },
  pending: { icon: Clock3, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Under Review' },
}

function DocumentStatusRow({ doc, onReupload, reuploadingType }) {
  const fileInputRef = useRef(null)
  const config = STATUS_CONFIG[doc.verification_status] || STATUS_CONFIG.pending
  const canReupload = doc.verification_status === 'rejected' && onReupload
  const isUploading = reuploadingType === doc.document_type

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

    onReupload?.(doc.document_type, file)
    e.target.value = ''
  }

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${config.bg}`}>
      {createElement(config.icon, { className: `h-4 w-4 shrink-0 ${config.color}` })}
      <span className="flex-1 text-sm font-semibold text-slate-800">
        {DOCUMENT_LABELS[doc.document_type] ?? doc.document_type}
      </span>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
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
              className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1 text-[11px] font-bold text-red-700 transition-all hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50"
            >
              {isUploading ? (
                <><span className="h-3 w-3 animate-spin rounded-full border-2 border-red-200 border-t-red-600" />Uploading...</>
              ) : (
                <><Upload className="h-3 w-3" />Re-upload</>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function PendingVerificationBanner({ status, rejectionReason, documents = [], requiredDocuments = [], onReupload, reuploadingType }) {
  const approvedCount = documents.filter((d) => d.verification_status === 'approved').length
  const rejectedDocs = documents.filter((d) => d.verification_status === 'rejected')
  const totalRequired = requiredDocuments.length || documents.length || 1
  const progressPercent = Math.round((approvedCount / totalRequired) * 100)
  const hasDocuments = documents.length > 0

  if (status === 'verified') {
    return (
      <AlertBox variant="success" title="Employer account verified">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>PESO has approved your company requirements. Job posting and vacancy management are enabled.</span>
        </div>
      </AlertBox>
    )
  }

  if (status === 'pending') {
    return (
      <div className="space-y-3">
        <AlertBox title="Your accreditation is under PESO review">
          Urdaneta City PESO is reviewing your employer information and legal documents. You will receive an email and dashboard notification when the status changes.
        </AlertBox>
        {hasDocuments && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">Document Verification Progress</p>
              <span className="text-xs font-bold text-slate-500">{approvedCount} of {totalRequired} approved</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-3 space-y-1.5">
              {documents.map((doc) => (
                <DocumentStatusRow key={doc.document_id} doc={doc} onReupload={onReupload} reuploadingType={reuploadingType} />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="space-y-3">
        <AlertBox variant="danger" title="Your accreditation needs attention">
          {rejectionReason || 'Review the administrator feedback, correct your employer requirements, and submit them again.'}
        </AlertBox>
        {(rejectedDocs.length > 0 || hasDocuments) && (
          <div className="rounded-xl border border-red-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-red-600" />
              <p className="text-sm font-bold text-red-800">Documents Requiring Resubmission</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Click <strong>Re-upload</strong> next to each rejected document to submit a corrected version. The document will be sent back for PESO review.
            </p>
            <div className="mt-3 space-y-1.5">
              {rejectedDocs.length > 0
                ? rejectedDocs.map((doc) => (
                    <DocumentStatusRow key={doc.document_id} doc={doc} onReupload={onReupload} reuploadingType={reuploadingType} />
                  ))
                : documents.map((doc) => (
                    <DocumentStatusRow key={doc.document_id} doc={doc} onReupload={onReupload} reuploadingType={reuploadingType} />
                  ))
              }
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}
