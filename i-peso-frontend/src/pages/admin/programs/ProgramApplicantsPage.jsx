// i-peso-frontend/src/pages/admin/programs/ProgramApplicantsPage.jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageHeader from '@/components/admin/PageHeader'
import DataTable from '@/components/admin/DataTable'
import StatusBadge from '@/components/admin/StatusBadge'
import { adminService } from '@/services/adminService'

export default function ProgramApplicantsPage() {
  const { id: programId } = useParams()
  const navigate = useNavigate()
  const [applicants, setApplicants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminService.getProgramApplicants(programId).then(d => {
      setApplicants(d.data || [])
      setLoading(false)
    }).catch(e => {
      console.error(e)
      setLoading(false)
    })
  }, [programId])

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <PageHeader title="Program Applicants" />
        <button onClick={() => navigate('/admin/programs')} className="text-sm font-medium text-slate-600">← Back</button>
      </div>
      <DataTable
        columns={[
          { key: 'seeker', label: 'Seeker Name', render: (_, row) => row.seeker?.first_name + ' ' + row.seeker?.last_name },
          { key: 'seeker', label: 'Email', render: (_, row) => row.seeker?.email },
          { key: 'status', label: 'Status', render: (s) => <StatusBadge status={s} /> },
          { key: 'created_at', label: 'Applied', render: (d) => new Date(d).toLocaleDateString() },
        ]}
        data={applicants}
        loading={loading}
      />
    </div>
  )
}