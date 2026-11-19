import { useState } from 'react'
import apiClient from '@/services/api'

// NSRP_Jobseeker_LastName_FirstName.pdf — the same name the server sends (NsrpFormData::filename).
const filePart = (value) => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

function fallbackFilename(seekerId, lastName, firstName, seekerName) {
  const name = [filePart(lastName), filePart(firstName)].filter(Boolean).join('_') || filePart(seekerName)
  return `NSRP_Jobseeker_${name || seekerId}.pdf`
}

function filenameFromHeader(disposition) {
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition ?? '')
  return match ? decodeURIComponent(match[1].trim()) : null
}

export default function DownloadNSRPButton({ seekerId, seekerName = 'Job Seeker', lastName, firstName }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleDownloadPDF = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Call API endpoint to generate PDF
      const response = await apiClient.get(
        `/admin/job-seekers/${seekerId}/export-nsrp-pdf`,
        {
          responseType: 'blob', // Important: expect binary data
          headers: {
            Accept: 'application/pdf',
          },
        }
      )

      // Create a Blob from the response
      const blob = new Blob([response.data], { type: 'application/pdf' })

      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob)

      // Create a link element and trigger download
      const link = document.createElement('a')
      link.href = url
      link.download = filenameFromHeader(response.headers?.['content-disposition'])
        ?? fallbackFilename(seekerId, lastName, firstName, seekerName)

      // Append to DOM, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the URL
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading PDF:', err)
      setError(
        err.response?.data?.message ||
          'Failed to download PDF. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleDownloadPDF}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8m0 0l-4 4m4-4l4 4"
          />
        </svg>
        {isLoading ? 'Generating PDF...' : 'Download NSRP PDF'}
      </button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
