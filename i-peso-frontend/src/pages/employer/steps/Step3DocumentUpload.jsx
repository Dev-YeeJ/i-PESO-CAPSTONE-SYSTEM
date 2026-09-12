import { useState, useEffect } from 'react'
import * as employerService from '@/services/employerService'
import DocumentUploadZone from '../components/DocumentUploadZone'
import RequiredDocumentsCheckbox from '../components/RequiredDocumentsCheckbox'

const COMPANY_TYPES = [
  { value: 'sole_proprietorship', label: 'Sole Proprietorship', helper: 'Best for DTI-registered single-owner businesses.' },
  { value: 'corporation_partnership', label: 'Corporation / Partnership', helper: 'Use for SEC-registered corporations or partnerships.' },
  { value: 'local_recruitment_agency', label: 'Local Recruitment Agency', helper: 'Use when recruiting workers for local placement.' },
  { value: 'overseas_recruitment_agency', label: 'Overseas Recruitment Agency', helper: 'Use for overseas placement agencies subject to additional review.' },
  { value: 'government_agency', label: 'Government Agency / LGU', helper: 'Use for a national government agency or local government unit office.' },
]

// Surfaces the backend's actual validation message when there is one (a 422
// carries the real reason — wrong file type, expired date, etc.) instead of
// Axios's generic "Request failed with status code 422". When there's no
// response at all (Axios's bare "Network Error"), that usually means the
// upload never reached the server — most commonly the file tripped the
// server's upload size limit before Laravel's own 10MB check ever ran — so
// say that instead of the opaque default.
function uploadErrorMessage(err) {
  const data = err.response?.data
  if (data?.errors) {
    const firstError = Object.values(data.errors)[0]
    if (firstError?.[0]) return firstError[0]
  }
  if (data?.message) return data.message
  if (!err.response) {
    return 'Upload failed — the file may be too large for the server, or your connection dropped. Try a smaller file or check your connection, then try again.'
  }
  return err.message
}

export default function Step3DocumentUpload({ companyType, onCompanyTypeSet, onComplete }) {
  const [requiredDocuments, setRequiredDocuments] = useState([])
  const [optionalDocuments, setOptionalDocuments] = useState([])
  const [uploadedDocuments, setUploadedDocuments] = useState([])
  const [uploading, setUploading] = useState({})
  const [error, setError] = useState(null)
  const [initialLoading, setInitialLoading] = useState(Boolean(companyType))
  const [selectedCompanyType, setSelectedCompanyType] = useState('')
  const [savingCompanyType, setSavingCompanyType] = useState(false)

  useEffect(() => {
    // Company type is picked at the top of this step (see the form below),
    // so there is nothing to fetch yet until it's set.
    if (!companyType) return

    const fetchRequiredDocs = async () => {
      try {
        const response = await employerService.getRequiredDocuments()
        setRequiredDocuments(response.required_documents || [])
        setOptionalDocuments(response.optional_documents || [])
        setUploadedDocuments(response.uploaded_documents || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setInitialLoading(false)
      }
    }

    fetchRequiredDocs()
  }, [companyType])

  const handleCompanyTypeSubmit = async (e) => {
    e.preventDefault()
    if (!selectedCompanyType) return
    setSavingCompanyType(true)
    setError(null)
    try {
      const response = await employerService.setCompanyType(selectedCompanyType)
      setRequiredDocuments(response.required_documents || [])
      setOptionalDocuments(response.optional_documents || [])
      setUploadedDocuments(response.uploaded_documents || [])
      setInitialLoading(false)
      onCompanyTypeSet?.(selectedCompanyType)
    } catch (err) {
      setError(err.response?.data?.errors?.company_type?.[0] || err.response?.data?.message || err.message)
    } finally {
      setSavingCompanyType(false)
    }
  }

  const handleDocumentUpload = async (documentType, file, expirationDate = null) => {
    setUploading((prev) => ({ ...prev, [documentType]: true }))
    try {
      await employerService.uploadDocument(documentType, file, expirationDate)
      setUploadedDocuments((prev) => {
        if (!prev.includes(documentType)) {
          return [...prev, documentType]
        }
        return prev
      })
      setError(null)
    } catch (err) {
      setError(uploadErrorMessage(err))
    } finally {
      setUploading((prev) => ({ ...prev, [documentType]: false }))
    }
  }

  const allDocumentsUploaded = requiredDocuments.length > 0 && requiredDocuments.every((doc) => uploadedDocuments.includes(doc))

  const handleContinue = () => {
    if (allDocumentsUploaded) {
      onComplete({ documentsUploaded: uploadedDocuments })
    }
  }

  if (!companyType) {
    return (
      <form onSubmit={handleCompanyTypeSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <h3 className="font-semibold text-slate-900">Select your company's legal type</h3>
          <p className="mt-1 text-xs text-slate-500">
            This determines which permits and registrations PESO will ask you to upload below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {COMPANY_TYPES.map((type) => (
            <label
              key={type.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition ${selectedCompanyType === type.value ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <input
                type="radio"
                name="company_type"
                value={type.value}
                checked={selectedCompanyType === type.value}
                onChange={(e) => setSelectedCompanyType(e.target.value)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-bold text-slate-800">{type.label}</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">{type.helper}</span>
              </span>
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={!selectedCompanyType || savingCompanyType}
          className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {savingCompanyType ? 'Saving...' : 'Continue'}
        </button>
      </form>
    )
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-slate-600">Loading required documents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <RequiredDocumentsCheckbox
        requiredDocuments={requiredDocuments}
        uploadedDocuments={uploadedDocuments}
      />

      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900">Upload Required Documents</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requiredDocuments.map((docType) => (
            <DocumentUploadZone
              key={docType}
              documentType={docType}
              isUploaded={uploadedDocuments.includes(docType)}
              onUpload={(file, expirationDate) => handleDocumentUpload(docType, file, expirationDate)}
              loading={uploading[docType] || false}
            />
          ))}
        </div>
      </div>

      {optionalDocuments.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-slate-900">Optional / Local PESO Documents</h3>
            <p className="mt-1 text-xs text-slate-500">
              Upload these when requested by the local PESO or when already available.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {optionalDocuments.map((docType) => (
              <DocumentUploadZone
                key={docType}
                documentType={docType}
                isUploaded={uploadedDocuments.includes(docType)}
                onUpload={(file, expirationDate) => handleDocumentUpload(docType, file, expirationDate)}
                loading={uploading[docType] || false}
                optional
              />
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">For {(companyType || 'your company').replace(/_/g, ' ')}:</p>
        <p>Upload all {requiredDocuments.length} required documents to proceed. Optional files do not block submission.</p>
      </div>

      <button
        type="button"
        onClick={handleContinue}
        disabled={!allDocumentsUploaded}
        className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {allDocumentsUploaded ? 'Save & Continue' : `Upload all documents to continue (${uploadedDocuments.length}/${requiredDocuments.length})`}
      </button>
    </div>
  )
}
