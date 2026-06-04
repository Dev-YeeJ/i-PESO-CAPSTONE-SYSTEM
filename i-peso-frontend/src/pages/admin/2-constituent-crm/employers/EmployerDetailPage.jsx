// i-peso-frontend/src/pages/admin/employers/EmployerDetailPage.jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageHeader from '@/pages/admin/_components/PageHeader'
import { adminService } from '@/services/adminService'

export default function EmployerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [employer, setEmployer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminService.getEmployerDetail(id).then(setEmployer).catch(e => {
      console.error(e)
      setLoading(false)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-center py-8">Loading...</div>
  if (!employer) return <div className="text-center py-8">Employer not found</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <PageHeader title={employer.company_name} subtitle="Employer Profile" />
        <button onClick={() => navigate('/admin/employers')} className="text-sm font-medium text-slate-600">← Back</button>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-600">Representative</p>
            <p className="font-semibold">{employer.representative_name}</p>
          </div>
          <div>
            <p className="text-slate-600">Email</p>
            <p className="font-semibold">{employer.email}</p>
          </div>
          <div>
            <p className="text-slate-600">Mobile</p>
            <p className="font-semibold">{employer.mobile_number}</p>
          </div>
          <div>
            <p className="text-slate-600">Industry</p>
            <p className="font-semibold">{employer.industry_type}</p>
          </div>
        </div>
      </div>
    </div>
  )
}