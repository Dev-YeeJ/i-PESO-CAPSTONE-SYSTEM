// i-peso-frontend/src/pages/admin/job-fairs/JobFairsListPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui'
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
    <div className="portal-page">
      <PageHeader
        title="Job Fairs"
        subtitle="Schedule and manage regional job fairs and community hiring events."
        eyebrow="Government & DOLE"
        actions={[{ label: 'Create Job Fair', onClick: () => navigate('/admin/job-fairs/create'), variant: 'primary' }]}
      />

      <Card padding="none" className="mt-6">
        <div className="p-5 sm:p-6 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Job Fairs Directory</h2>
            <p className="text-sm text-slate-500">View and organize all upcoming and past hiring events.</p>
          </div>
        </div>
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
      </Card>
    </div>
  )
}