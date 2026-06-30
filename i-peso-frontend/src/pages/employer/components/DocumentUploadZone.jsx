// src/pages/employer/components/DocumentUploadZone.jsx
import { useState, useRef } from 'react'

export default function DocumentUploadZone({ documentType, isUploaded, onUpload, loading, optional = false }) {
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState(null)
  const fileInputRef = useRef(null)

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

    setFileName(file.name)
    await onUpload(file)
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
    }
    return labels[type] || type
  }

  return (
    <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors h-full flex flex-col justify-center">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept=".pdf,.jpg,.jpeg,.png"
        hidden
      />

      {isUploaded ? (
        <div className="text-green-600 flex flex-col items-center justify-center">
          <svg className="w-8 h-8 mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="font-semibold text-sm">{getDocumentLabel(documentType)}{optional ? ' (Optional)' : ''}</p>
          <p className="text-xs text-slate-600 truncate max-w-[200px]">{fileName}</p>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`cursor-pointer transition-all flex flex-col items-center justify-center h-full ${isDragging ? 'bg-blue-50' : ''}`}
        >
          <svg className="w-8 h-8 mb-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <p className="text-xs font-medium text-slate-700 mb-1">
            Drag & drop your {getDocumentLabel(documentType).toLowerCase()}{optional ? ' (optional)' : ''}
            disabled={loading}
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Uploading...' : 'Click to select'}
          </button>
          <p className="text-xs text-slate-500 mt-3">PDF or image (max 10MB)</p>
        </div>
      )}
    </div>
  )
}
