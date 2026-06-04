// i-peso-frontend/src/pages/admin/job-fairs/JobFairsListPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/pages/admin/_components/PageHeader'
import DataTable from '@/pages/admin/_components/DataTable'
import StatusBadge from '@/pages/admin/_components/StatusBadge'
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
        actions={[{ label: 'Create Job Fair', onClick: () => navigate('/admin/job-fairs/create') }]}
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