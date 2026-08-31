import { createElement, useRef, useState } from 'react'
import { CheckCircle2, Clock3, RotateCcw, ShieldCheck, Upload, XCircle, Eye } from 'lucide-react'
import { AlertBox } from '@/components/ui'

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

const STATUS_CONFIG = {
  approved: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Rejected' },
  pending: { icon: Clock3, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Under Review' },
  expired: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Expired' },
}

// Expiry is tracked by `expiration_date`, not by verification_status — the column is an
// enum of pending/approved/rejected only. A lapsed document therefore stays "approved"
// or "pending" in the database and has to be derived here.
//
// The comparison is inclusive and local on purpose. NotifyExpiringMayorsPermits treats
// `daysLeft <= 0` as expired, so a permit dated today has lapsed; and toISOString() is
// UTC, which would leave UTC+8 users reading yesterday's date until 8am.
function isExpiredDocument(doc) {
  if (!doc?.expiration_date) return false
  const now = new Date()
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  return doc.expiration_date <= today
}

function DocumentStatusRow({ doc, accountStatus, onReupload, reuploadingType }) {
  const fileInputRef = useRef(null)
  const [showDateInput, setShowDateInput] = useState(false)
  const [expirationDate, setExpirationDate] = useState('')

  const isExpired = isExpiredDocument(doc)
  const config = isExpired
    ? STATUS_CONFIG.expired
    : STATUS_CONFIG[doc.verification_status] || STATUS_CONFIG.pending
  // Allow re-upload when doc is rejected or has lapsed, OR when account is rejected and
  // doc is pending (so the employer can replace any doc they want during resubmission)
  const canReupload = onReupload && (
    doc.verification_status === 'rejected' ||
    isExpired ||
    (doc.verification_status === 'pending' && accountStatus === 'rejected')
  )
  const isMayorsPermit = doc.document_type === 'mayors_permit'
  const isUploading = reuploadingType === doc.document_type

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

    onReupload?.(doc.document_type, file, isMayorsPermit ? expirationDate : null)
    e.target.value = ''
    setExpirationDate('')
    setShowDateInput(false)
  }

  const today = new Date()
  const minDate = new Date(today.setDate(today.getDate() + 1)).toISOString().split('T')[0]

  return (
    <div className={`rounded-lg border px-3 py-2 ${config.bg}`}>
      <div className="flex items-center gap-3">
        {createElement(config.icon, { className: `h-4 w-4 shrink-0 ${config.color}` })}
        <span className="flex-1 text-sm font-semibold text-slate-800">
          {DOCUMENT_LABELS[doc.document_type] ?? doc.document_type}
        </span>
        <div className="flex items-center gap-2">
          {doc.verification_status === 'pending' && doc.viewed_at && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
              <Eye className="h-3 w-3" />
              Viewed
            </span>
          )}
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
              {isMayorsPermit && showDateInput ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={expirationDate}
                    min={minDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="rounded border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-700 focus:border-red-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => expirationDate && fileInputRef.current?.click()}
                    disabled={isUploading || !expirationDate}
                    title={!expirationDate ? 'Select expiration date first' : 'Select file'}
                    className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1 text-[11px] font-bold text-red-700 transition-all hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {isUploading
                      ? <><span className="h-3 w-3 animate-spin rounded-full border-2 border-red-200 border-t-red-600" />Uploading...</>
                      : <><Upload className="h-3 w-3" />Select file</>}
                  </button>
                  <button type="button" onClick={() => { setShowDateInput(false); setExpirationDate('') }} className="text-[11px] text-slate-400 hover:text-slate-600">✕</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => isMayorsPermit ? setShowDateInput(true) : fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1 text-[11px] font-bold text-red-700 transition-all hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50"
                >
                  {isUploading
                    ? <><span className="h-3 w-3 animate-spin rounded-full border-2 border-red-200 border-t-red-600" />Uploading...</>
                    : <><Upload className="h-3 w-3" />Re-upload</>}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PendingVerificationBanner({ status, rejectionReason, documents = [], requiredDocuments = [], onReupload, reuploadingType }) {
  // Exclude company_logo since it doesn't get verified by admins
  const verifiableDocs = documents.filter((d) => d.document_type !== 'company_logo')
  const approvedCount = verifiableDocs.filter((d) => d.verification_status === 'approved').length
  const rejectedDocs = verifiableDocs.filter((d) => d.verification_status === 'rejected')
  // Total required is the max of the company required documents or the actual uploaded verifiable documents
  // (since they also upload government_id etc.)
  const totalRequired = Math.max(requiredDocuments.length, verifiableDocs.length) || 1
  const progressPercent = Math.min(100, Math.round((approvedCount / totalRequired) * 100))
  const hasDocuments = verifiableDocs.length > 0
  // A document can lapse long after it was approved, so expiry is surfaced on every
  // account status — including verified accounts, which otherwise render no document rows.
  const expiredDocs = verifiableDocs.filter(isExpiredDocument)

  // `withRows` is only for branches that render no document list of their own — otherwise
  // the lapsed document would appear twice, each copy with its own re-upload button.
  const expiredNotice = (withRows) => expiredDocs.length > 0 && (
    <AlertBox variant="danger" title={`${expiredDocs.length === 1 ? DOCUMENT_LABELS[expiredDocs[0].document_type] ?? 'A document' : `${expiredDocs.length} documents`} expired`}>
      <div className="space-y-2">
        <span>Upload a renewed copy to keep your account active.</span>
        {withRows && (
          <div className="space-y-1.5">
            {expiredDocs.map((doc) => (
              <DocumentStatusRow key={doc.document_id} doc={doc} accountStatus={status} onReupload={onReupload} reuploadingType={reuploadingType} />
            ))}
          </div>
        )}
      </div>
    </AlertBox>
  )

  if (status === 'verified') {
    return (
      <div className="space-y-3">
        {expiredNotice(true)}
        <AlertBox variant="success" title="Employer account verified">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>PESO has approved your company requirements. Job posting and vacancy management are enabled.</span>
          </div>
        </AlertBox>
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="space-y-3">
        {expiredNotice(false)}
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
              {verifiableDocs.map((doc) => (
                <DocumentStatusRow key={doc.document_id} doc={doc} accountStatus={status} onReupload={onReupload} reuploadingType={reuploadingType} />
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
        {expiredNotice(false)}
        <AlertBox variant="danger" title="Your accreditation needs attention">
          {rejectionReason || 'Review the administrator feedback, correct your employer requirements, and submit them again.'}
        </AlertBox>
        {hasDocuments && (
          <div className="rounded-xl border border-red-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-red-600" />
              <p className="text-sm font-bold text-red-800">Documents Requiring Resubmission</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Click <strong>Re-upload</strong> next to each document to submit a corrected version. Once all documents are re-uploaded, your application will automatically go back for PESO review.
            </p>
            <div className="mt-3 space-y-1.5">
              {verifiableDocs.map((doc) => (
                <DocumentStatusRow key={doc.document_id} doc={doc} accountStatus={status} onReupload={onReupload} reuploadingType={reuploadingType} />
              ))}
            </div>
            {rejectedDocs.length === 0 && (
              <p className="mt-3 text-xs font-semibold text-amber-700">All documents are under review — your application has been resubmitted to PESO.</p>
            )}
          </div>
        )}
      </div>
    )
  }

  return null
}

