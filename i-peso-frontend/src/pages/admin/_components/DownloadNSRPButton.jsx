import { useState } from 'react'
import apiClient from '@/services/api'

export default function DownloadNSRPButton({ seekerId, seekerName = 'Job Seeker' }) {
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
      link.download = `NSRP_Form_${seekerId}_${seekerName.replace(/\s+/g, '_')}.pdf`

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
