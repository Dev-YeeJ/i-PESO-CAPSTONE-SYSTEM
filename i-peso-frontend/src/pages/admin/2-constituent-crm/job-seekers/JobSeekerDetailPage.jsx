// i-peso-frontend/src/pages/admin/seekers/SeekerDetailPage.jsx

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageHeader from '@/pages/admin/_components/PageHeader'
import { DownloadNSRPButton } from '@/pages/admin/_components'
import { adminService } from '@/services/adminService'

export default function SeekerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [seeker, setSeeker] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title={`${seeker.first_name} ${seeker.last_name}`}
          subtitle="NSRP Profile Information"
        />
        <div className="flex items-center gap-3">
          <DownloadNSRPButton 
            seekerId={seeker.seeker_id} 
            seekerName={`${seeker.first_name}_${seeker.last_name}`}
          />
          <button
            onClick={() => navigate('/admin/job-seekers')}
            className="text-slate-600 hover:text-slate-900 font-medium text-sm"
          >
            ← Back
          </button>
        </div>
      </div>

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

        {/* STEP 5: Education & Other Skills */}
        {seeker.educations && seeker.educations.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:col-span-2">
            <h3 className="font-bold text-slate-900 mb-4">Education Levels</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-semibold text-slate-900">Level</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-900">Course/Strand</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-900">Year Graduated</th>
                  </tr>
                </thead>
                <tbody>
                  {seeker.educations.map((edu, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-700">{edu.level || 'N/A'}</td>
                      <td className="py-2 px-3 text-slate-700">{edu.course_strand || '—'}</td>
                      <td className="py-2 px-3 text-slate-700">{edu.year_graduated || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {seeker.other_skills && seeker.other_skills.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:col-span-2">
            <h3 className="font-bold text-slate-900 mb-4">Other Skills (Without Certificate)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {seeker.other_skills.map((skill, idx) => (
                <span key={idx} className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* STEP 6: Trainings */}
        {seeker.trainings && seeker.trainings.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:col-span-2">
            <h3 className="font-bold text-slate-900 mb-4">Training Records</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-semibold text-slate-900">Course</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-900">Hours</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-900">Institution</th>
                  </tr>
                </thead>
                <tbody>
                  {seeker.trainings.map((train, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-700">{train.course || 'N/A'}</td>
                      <td className="py-2 px-3 text-slate-700">{train.hours_of_training || '—'}</td>
                      <td className="py-2 px-3 text-slate-700">{train.training_institution || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STEP 6: Eligibilities */}
        {seeker.eligibilities && seeker.eligibilities.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:col-span-2">
            <h3 className="font-bold text-slate-900 mb-4">Professional Licenses & Eligibilities</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-semibold text-slate-900">Type</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-900">Name</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-900">Date Taken</th>
                  </tr>
                </thead>
                <tbody>
                  {seeker.eligibilities.map((elig, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-700">{elig.type || 'N/A'}</td>
                      <td className="py-2 px-3 text-slate-700">{elig.name || 'N/A'}</td>
                      <td className="py-2 px-3 text-slate-700">{elig.date_taken || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STEP 7: Work Experience */}
        {seeker.work_experiences && seeker.work_experiences.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:col-span-2">
            <h3 className="font-bold text-slate-900 mb-4">Work Experience</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-semibold text-slate-900">Company</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-900">Position</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-900">Months</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {seeker.work_experiences.map((exp, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-700">{exp.company_name || 'N/A'}</td>
                      <td className="py-2 px-3 text-slate-700">{exp.position || 'N/A'}</td>
                      <td className="py-2 px-3 text-slate-700">{exp.number_of_months || '—'}</td>
                      <td className="py-2 px-3 text-slate-700">{exp.employment_status || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
