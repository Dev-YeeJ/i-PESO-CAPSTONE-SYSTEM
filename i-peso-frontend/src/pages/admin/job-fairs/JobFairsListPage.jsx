// i-peso-frontend/src/pages/admin/job-fairs/JobFairsListPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/components/admin/PageHeader'
import DataTable from '@/components/admin/DataTable'
import StatusBadge from '@/components/admin/StatusBadge'
import { adminService } from '@/services/adminService'

export default function JobFairsListPage() {
  const [fairs, setFairs] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    adminService.getJobFairsList({ per_page: 15 }).then(d => {
      setFairs(d.data || [])
      setLoading(false)
    }).catch(e => {
      console.error(e)
      setLoading(false)
    })
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Fairs"
        subtitle="Schedule and manage job fairs"
        actions={[{ label: 'Create Job Fair', onClick: () => navigate('/admin/job-fairs/new') }]}
      />
      <DataTable
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'venue', label: 'Venue' },
          { key: 'event_date', label: 'Date', render: (d) => new Date(d).toLocaleDateString() },
          { key: 'status', label: 'Status', render: (s) => <StatusBadge status={s} /> },
        ]}
        data={fairs}
        loading={loading}
      />
    </div>
  )
}