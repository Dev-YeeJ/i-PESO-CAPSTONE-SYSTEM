// src/pages/employer/components/DocumentUploadZone.jsx
import { useState, useRef, useEffect } from 'react'

// Local-time "YYYY-MM-DD" for the expiration date `min` (no past dates).
const todayLocalDate = () => {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

export default function DocumentUploadZone({
  documentType,
  isUploaded,
  fileMeta,
  onUpload,
  onUndo,
  loading,
  optional = false,
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState(fileMeta?.original_filename || null)
  const [expirationDate, setExpirationDate] = useState(fileMeta?.expiration_date || '')
  const fileInputRef = useRef(null)

  const requiresExpiration = documentType === 'mayors_permit'

  // Keep local filename and expiration date in sync when fileMeta updates from server
  useEffect(() => {
    if (fileMeta?.original_filename) {
      setFileName(fileMeta.original_filename)
    }
    if (fileMeta?.expiration_date) {
      setExpirationDate(fileMeta.expiration_date)
    }
  }, [fileMeta])

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      processFile(file)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      processFile(file)
    }
  }

  const processFile = async (file) => {
    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!validTypes.includes(file.type)) {
      alert('Please upload PDF or image files only')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    // Mayor's Permit requires an expiration date before it can be uploaded.
    if (requiresExpiration && !expirationDate) {
      alert("Please enter the Mayor's Permit expiration date before uploading.")
      return
    }

    setFileName(file.name)
    await onUpload(file, requiresExpiration ? expirationDate : null)
  }

  const handleUndo = async (e) => {
    e?.preventDefault()
    e?.stopPropagation()
    setFileName(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (onUndo) {
      await onUndo()
    }
  }

  const triggerFileInput = (e) => {
    e?.stopPropagation()
    fileInputRef.current?.click()
  }

  const getDocumentLabel = (type) => {
    const labels = {
      'mayors_permit': "Mayor's Permit",
      'bir_certificate': 'BIR Certificate of Registration (Form 2303)',
      'philJobnet_proof': 'PhilJobNet Registration Proof',
      'dti_certificate': 'DTI Certificate of Registration',
      'sec_certificate': 'SEC Certificate of Registration',
      'prpa_license': 'DOLE PRPA License',
      'dme_poea_license': 'DMW / POEA License',
      'affidavit_of_undertaking': 'Affidavit of Undertaking',
      'no_pending_case_certificate': 'Certificate of No Pending Case (DOLE)',
    }
    return labels[type] || type
  }

  const label = getDocumentLabel(documentType)
  const displayFileName = fileName || fileMeta?.original_filename || (isUploaded ? 'Uploaded Document' : null)

  return (
    <div className={`border-2 rounded-xl overflow-hidden transition-all h-full flex flex-col bg-white shadow-xs ${
      isUploaded
        ? 'border-emerald-300 ring-1 ring-emerald-200'
        : 'border-dashed border-slate-300 hover:border-blue-400'
    }`}>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept=".pdf,.jpg,.jpeg,.png"
        hidden
      />

      {/* Document name header — large, bold, high-contrast and easy to read */}
      <div className={`px-4 py-3 border-b flex items-center justify-between gap-2 ${
        isUploaded ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            isUploaded ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
          }`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-sm md:text-base font-bold text-slate-900 truncate" title={label}>
            {label}
            {optional ? (
              <span className="ml-1.5 text-xs font-normal text-slate-500">(Optional)</span>
            ) : (
              <span className="ml-1 text-red-500 font-bold" title="Required Document">*</span>
            )}
          </span>
        </div>

        {isUploaded ? (
          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full px-2.5 py-0.5">
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Uploaded
          </span>
        ) : (
          <span className="shrink-0 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {optional ? 'Optional' : 'Required'}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 justify-center text-center">
        {isUploaded ? (
          <div className="flex flex-col items-center justify-center py-2 px-1">
            <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2 shadow-xs">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-bold text-sm text-slate-800">Document Uploaded</p>

            {/* Display File Name */}
            <div className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg max-w-full">
              <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate max-w-[220px]" title={displayFileName}>
                {displayFileName}
              </span>
            </div>

            {requiresExpiration && (expirationDate || fileMeta?.expiration_date) && (
              <p className="mt-2 text-xs font-medium text-slate-600">
                Expires: <span className="font-semibold text-slate-800">{expirationDate || fileMeta?.expiration_date}</span>
              </p>
            )}

            {/* Undo & Change File Actions */}
            <div className="mt-3.5 flex items-center gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 hover:border-rose-300 transition-colors shadow-xs disabled:opacity-50"
                title="Undo or remove this uploaded document"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4" />
                </svg>
                Undo
              </button>
              <button
                type="button"
                onClick={triggerFileInput}
                disabled={loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-xs disabled:opacity-50"
                title="Replace with a different file"
              >
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Change File
              </button>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col justify-center">
            {requiresExpiration && (
              <label className="mb-3 block text-left">
                <span className="text-xs font-bold text-slate-700">
                  Permit Expiration Date <span className="text-red-500">*</span>
                </span>
                <input
                  type="date"
                  value={expirationDate}
                  min={todayLocalDate()}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </label>
            )}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`cursor-pointer transition-all flex flex-col items-center justify-center p-3 rounded-lg ${
                isDragging ? 'bg-blue-50 border-2 border-blue-400' : ''
              }`}
            >
              <svg className="w-7 h-7 mb-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-xs text-slate-600 mb-2">Drag &amp; drop file here, or</p>
              <button
                type="button"
                onClick={triggerFileInput}
                disabled={loading || (requiresExpiration && !expirationDate)}
                className="inline-block px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Uploading...' : 'Click to select'}
              </button>
              {requiresExpiration && !expirationDate && (
                <p className="mt-2 text-xs font-semibold text-amber-600">Enter expiration date first</p>
              )}
              <p className="text-[11px] text-slate-400 mt-2">PDF, JPG, or PNG (max 10MB)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
