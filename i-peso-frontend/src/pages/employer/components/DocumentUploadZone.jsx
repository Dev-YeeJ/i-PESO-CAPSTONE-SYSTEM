// src/pages/employer/components/DocumentUploadZone.jsx
import { useState, useRef } from 'react'

// Local-time "YYYY-MM-DD" for the expiration date `min` (no past dates).
const todayLocalDate = () => {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

export default function DocumentUploadZone({ documentType, isUploaded, onUpload, loading, optional = false }) {
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState(null)
  const [expirationDate, setExpirationDate] = useState('')
  const fileInputRef = useRef(null)

  const requiresExpiration = documentType === 'mayors_permit'

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

  const triggerFileInput = () => {
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

  return (
    <div className="border-2 border-dashed border-slate-300 rounded-lg overflow-hidden hover:border-blue-400 transition-colors h-full flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept=".pdf,.jpg,.jpeg,.png"
        hidden
      />

      {/* Document name header — always visible */}
      <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-xs font-bold text-slate-800 leading-tight">
          {label}{optional ? <span className="ml-1 font-normal text-slate-500">(Optional)</span> : <span className="ml-1 text-red-500">*</span>}
        </span>
      </div>

      <div className="p-4 flex flex-col flex-1 justify-center text-center">
        {isUploaded ? (
          <div className="text-green-600 flex flex-col items-center justify-center">
            <svg className="w-8 h-8 mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="font-semibold text-sm text-green-700">Uploaded</p>
            <p className="text-xs text-slate-600 truncate max-w-[200px]">{fileName}</p>
            {requiresExpiration && expirationDate && (
              <p className="mt-1 text-xs font-medium text-slate-500">Expires: {expirationDate}</p>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col justify-center">
            {requiresExpiration && (
              <label className="mb-3 block text-left">
                <span className="text-xs font-semibold text-slate-700">
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
              className={`cursor-pointer transition-all flex flex-col items-center justify-center ${isDragging ? 'bg-blue-50 rounded-lg' : ''}`}
            >
              <svg className="w-7 h-7 mb-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <p className="text-xs text-slate-500 mb-2">Drag & drop or</p>
              <button
                type="button"
                onClick={triggerFileInput}
                disabled={loading || (requiresExpiration && !expirationDate)}
                className="inline-block px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Uploading...' : 'Click to select'}
              </button>
              {requiresExpiration && !expirationDate && (
                <p className="mt-2 text-xs font-medium text-amber-600">Enter the expiration date first</p>
              )}
              <p className="text-xs text-slate-400 mt-2">PDF or image (max 10MB)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
