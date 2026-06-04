// i-peso-frontend/src/pages/admin/seekers/VerificationQueuePage.jsx

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/pages/admin/_components/PageHeader'
import { adminService } from '@/services/adminService'

const CheckCircleIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const UserIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

export default function VerificationQueuePage() {
  const [seekers, setSeekers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        setLoading(true)
        const data = await adminService.getVerificationQueue({ per_page: 50 })
        setSeekers(data.data || [])
        setError(null)
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load verification queue')
        console.error('Queue error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchQueue()
  }, [])

  const handleReviewClick = useCallback((id) => {
    navigate(`/admin/job-seekers/${id}`)
  }, [navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-slate-600">Loading verification queue...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <h3 className="font-semibold text-red-900">Error</h3>
        <p className="text-red-700 text-sm mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <PageHeader
            title="Verification Queue"
            subtitle="Profiles pending administrative verification"
          />
        </div>
        <div className="inline-block bg-amber-100 text-amber-800 rounded-full px-4 py-2 text-sm font-bold">
          {seekers.length} pending
        </div>
      </div>

      {seekers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-900 mt-4">All caught up!</h3>
          <p className="text-slate-600 mt-2">No profiles are pending verification at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {seekers.map((seeker) => (
            <div
              key={seeker.seeker_id}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              {/* Avatar */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserIcon />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {seeker.first_name} {seeker.last_name}
                  </h3>
                  <p className="text-xs text-slate-500">{seeker.email}</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 mb-4 pb-4 border-b border-slate-100">
                <div className="text-sm">
                  <p className="text-slate-600">
                    <span className="font-medium">Province:</span> {seeker.address_province || 'N/A'}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium">City:</span> {seeker.address_municipality_city || 'N/A'}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium">Education:</span> {seeker.educ_attainment || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleReviewClick(seeker.seeker_id)}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
              >
                Review Profile
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
