import { useState, useEffect } from 'react'
import * as employerService from '@/services/employerService'
import DocumentUploadZone from '../components/DocumentUploadZone'
import RequiredDocumentsCheckbox from '../components/RequiredDocumentsCheckbox'

export default function Step3DocumentUpload({ companyType, onComplete }) {
  const [requiredDocuments, setRequiredDocuments] = useState([])
  const [optionalDocuments, setOptionalDocuments] = useState([])
  const [uploadedDocuments, setUploadedDocuments] = useState([])
  const [uploading, setUploading] = useState({})
  const [error, setError] = useState(null)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
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
  }, [])

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
      setError(err.message)
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
