// src/pages/employer/components/RequiredDocumentsCheckbox.jsx
export default function RequiredDocumentsCheckbox({ requiredDocuments, uploadedDocuments }) {
  const getDocumentLabel = (type) => {
    const labels = {
      'mayors_permit': "Mayor's Permit",
      'bir_certificate': 'BIR Certificate of Registration (Form 2303)',
      'dti_certificate': 'DTI Certificate of Registration',
      'sec_certificate': 'SEC Certificate of Registration',
      'prpa_license': 'DOLE PRPA License',
      'dme_poea_license': 'DMW / POEA License',
    }
    return labels[type] || type
  }

  const uploadedSet = new Set(uploadedDocuments || [])
  const uploadedCount = uploadedDocuments?.length || 0
  const totalCount = requiredDocuments?.length || 0

  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-slate-900">Required Documents</h3>
        <span className="text-sm font-medium text-blue-600">
          {uploadedCount} of {totalCount} uploaded
        </span>
      </div>

      <div className="space-y-2">
        {requiredDocuments?.map((doc) => {
          const isUploaded = uploadedSet.has(doc)
          return (
            <div key={doc} className="flex items-center space-x-3 p-2">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                isUploaded
                  ? 'bg-green-500 border-green-500'
                  : 'border-slate-300 bg-white'
              }`}>
                {isUploaded && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className={`text-sm ${isUploaded ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                {getDocumentLabel(doc)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
