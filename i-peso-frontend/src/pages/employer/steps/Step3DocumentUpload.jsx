import { useEffect, useState } from 'react'
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
  // The company type dropdown below is the single source of truth for what
  // this component shows — it's seeded from the `companyType` prop (an
  // employer returning mid-registration already has one on file) but from
  // then on is driven entirely by the dropdown, not by waiting on the prop
  // to round-trip back down from the parent.
  const [selectedCompanyType, setSelectedCompanyType] = useState(companyType || '')
  const [savingCompanyType, setSavingCompanyType] = useState(false)
  const [requiredDocuments, setRequiredDocuments] = useState([])
  const [optionalDocuments, setOptionalDocuments] = useState([])
  const [uploadedDocuments, setUploadedDocuments] = useState([])
  const [uploading, setUploading] = useState({})
  const [error, setError] = useState(null)
  const [initialLoading, setInitialLoading] = useState(Boolean(companyType))

  // Hydrates the document checklist once, only when the employer already
  // had a company type on file when this step mounted (e.g. they reloaded
  // the page mid-registration). Picking or changing the type afterwards is
  // handled entirely by handleCompanyTypeChange below, which already has
  // the required-documents list in its own response — so this never needs
  // to run again.
  useEffect(() => {
    if (!companyType) {
      setInitialLoading(false)
      return
    }

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
    // Intentionally runs once on mount only — see comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCompanyTypeChange = async (value) => {
    setSelectedCompanyType(value)
    setError(null)
    if (!value) return

    setSavingCompanyType(true)
    try {
      const response = await employerService.setCompanyType(value)
      setRequiredDocuments(response.required_documents || [])
      setOptionalDocuments(response.optional_documents || [])
      setUploadedDocuments(response.uploaded_documents || [])
      setInitialLoading(false)
      onCompanyTypeSet?.(value)
    } catch (err) {
      setSelectedCompanyType(companyType || '')
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

  const requiredUploadedCount = requiredDocuments.filter((doc) => uploadedDocuments.includes(doc)).length
  const allDocumentsUploaded = requiredDocuments.length > 0 && requiredUploadedCount === requiredDocuments.length

  const handleContinue = () => {
    if (allDocumentsUploaded) {
      onComplete({ documentsUploaded: uploadedDocuments })
    }
  }

  const selectedTypeMeta = COMPANY_TYPES.find((type) => type.value === selectedCompanyType)

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="company_type" className="text-sm font-semibold text-slate-800">
            Company Type
          </label>
          {savingCompanyType && <span className="text-xs font-medium text-blue-600">Saving...</span>}
        </div>
        <select
          id="company_type"
          value={selectedCompanyType}
          onChange={(e) => handleCompanyTypeChange(e.target.value)}
          disabled={savingCompanyType}
          className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-60"
        >
          <option value="" disabled>Select your company's legal type&hellip;</option>
          {COMPANY_TYPES.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
        {selectedTypeMeta && (
          <p className="mt-1.5 text-xs text-slate-500">{selectedTypeMeta.helper}</p>
        )}
      </div>

      {!selectedCompanyType ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
          Select your company type above to see the documents you need to upload.
        </div>
      ) : initialLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-slate-600">Loading required documents...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <RequiredDocumentsCheckbox
            requiredDocuments={requiredDocuments}
            uploadedDocuments={uploadedDocuments}
          />

          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 text-sm">Upload Required Documents</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Optional / Local PESO Documents</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Upload these when requested by the local PESO or when already available.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

          <button
            type="button"
            onClick={handleContinue}
            disabled={!allDocumentsUploaded}
            className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {allDocumentsUploaded ? 'Save & Continue' : `Upload all documents to continue (${requiredUploadedCount}/${requiredDocuments.length})`}
          </button>
        </div>
      )}
    </div>
  )
}
