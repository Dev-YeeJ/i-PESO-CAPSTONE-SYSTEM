// i-peso-frontend/src/pages/admin/seekers/SeekerDetailPage.jsx

import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageHeader from '@/pages/admin/_components/PageHeader'
import StatusBadge from '@/pages/admin/_components/StatusBadge'
import ConfirmModal from '@/pages/admin/_components/ConfirmModal'
import { adminService } from '@/services/adminService'

export default function SeekerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [seeker, setSeeker] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState(null)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    const fetchSeeker = async () => {
      try {
        setLoading(true)
        const data = await adminService.getSeekerDetail(id)
        setSeeker(data)
        setError(null)
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load seeker')
        console.error('Detail error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSeeker()
  }, [id])

  const handleVerify = useCallback((action) => {
    setModalAction(action)
    setModalOpen(true)
  }, [])

  const handleVerifyConfirm = useCallback(async (remarks) => {
    try {
      setVerifying(true)
      await adminService.verifySeekerProfile(id, modalAction, remarks)
      
      // Refresh seeker data
      const data = await adminService.getSeekerDetail(id)
      setSeeker(data)
      setModalOpen(false)
      setModalAction(null)
      setError(null)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to verify profile')
    } finally {
      setVerifying(false)
    }
  }, [id, modalAction])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-slate-600">Loading seeker profile...</p>
        </div>
      </div>
    )
  }

  if (error && !seeker) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <h3 className="font-semibold text-red-900">Error</h3>
        <p className="text-red-700 text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (!seeker) return null

  const isPendingVerification = seeker.profile_completed && !seeker.is_verified

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title={`${seeker.first_name} ${seeker.last_name}`}
          subtitle="NSRP Profile Information"
        />
        <button
          onClick={() => navigate('/admin/seekers')}
          className="text-slate-600 hover:text-slate-900 font-medium text-sm"
        >
          ← Back
        </button>
      </div>

      {/* Verification Banner */}
      {isPendingVerification && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-amber-900">Pending Verification</h3>
              <p className="text-amber-800 text-sm mt-1">This profile is complete and ready for verification</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleVerify('reject')}
                disabled={verifying}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl px-4 py-2 font-semibold text-sm"
              >
                {verifying ? 'Processing...' : 'Reject'}
              </button>
              <button
                onClick={() => handleVerify('approve')}
                disabled={verifying}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl px-4 py-2 font-semibold text-sm"
              >
                {verifying ? 'Processing...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {seeker.is_verified && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <StatusBadge status="completed" />
            <span className="text-sm text-green-700">
              Verified by admin on {new Date(seeker.verified_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Profile Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="font-bold text-slate-900 mb-4">Personal Information</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-slate-600">Name</p>
              <p className="font-semibold text-slate-900">{seeker.first_name} {seeker.last_name}</p>
            </div>
            <div>
              <p className="text-slate-600">Email</p>
              <p className="font-semibold text-slate-900">{seeker.email}</p>
            </div>
            <div>
              <p className="text-slate-600">Mobile</p>
              <p className="font-semibold text-slate-900">{seeker.mobile_number || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-600">Date of Birth</p>
              <p className="font-semibold text-slate-900">{seeker.date_of_birth || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-600">Sex</p>
              <p className="font-semibold text-slate-900">{seeker.sex ? seeker.sex.toUpperCase() : 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="font-bold text-slate-900 mb-4">Address</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-slate-600">Province</p>
              <p className="font-semibold text-slate-900">{seeker.address_province || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-600">Municipality/City</p>
              <p className="font-semibold text-slate-900">{seeker.address_municipality_city || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-600">Barangay</p>
              <p className="font-semibold text-slate-900">{seeker.address_barangay || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-600">Street Address</p>
              <p className="font-semibold text-slate-900">{seeker.address_street || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Education */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="font-bold text-slate-900 mb-4">Education</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-slate-600">Attainment</p>
              <p className="font-semibold text-slate-900">{seeker.educ_attainment || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Employment Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="font-bold text-slate-900 mb-4">Employment Status</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-slate-600">Status</p>
              <p className="font-semibold text-slate-900">{seeker.employment_status ? seeker.employment_status.toUpperCase() : 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-600">Type</p>
              <p className="font-semibold text-slate-900">{seeker.employment_type || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-600">Former OFW</p>
              <p className="font-semibold text-slate-900">{seeker.is_former_ofw ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>

        {/* Special Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="font-bold text-slate-900 mb-4">Special Status</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-slate-600">4Ps Beneficiary</p>
              <p className="font-semibold text-slate-900">{seeker.is_4ps_beneficiary ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="text-slate-600">Person with Disability</p>
              <p className="font-semibold text-slate-900">
                {seeker.disabilities && seeker.disabilities.length > 0 ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </div>

        {/* Job Preferences */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:col-span-2">
          <h3 className="font-bold text-slate-900 mb-4">Job Preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-600">Preferred Occupation</p>
              <p className="font-semibold text-slate-900">{seeker.preferred_occupation || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-600">Employment Type Preference</p>
              <p className="font-semibold text-slate-900">{seeker.employment_type_preference || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-600">Preferred Work Location</p>
              <p className="font-semibold text-slate-900">{seeker.preferred_work_location || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={modalOpen}
        title={modalAction === 'approve' ? 'Approve Profile' : 'Reject Profile'}
        message={
          modalAction === 'approve'
            ? 'Are you sure you want to approve this profile?'
            : 'Are you sure you want to reject this profile? The seeker will be notified.'
        }
        requiresReason={modalAction === 'reject'}
        onConfirm={handleVerifyConfirm}
        onCancel={() => setModalOpen(false)}
        confirmText={modalAction === 'approve' ? 'Approve' : 'Reject'}
        isDangerous={modalAction === 'reject'}
      />
    </div>
  )
}