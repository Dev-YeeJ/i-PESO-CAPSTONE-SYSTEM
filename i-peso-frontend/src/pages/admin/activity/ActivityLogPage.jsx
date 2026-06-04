// i-peso-frontend/src/pages/admin/activity/ActivityLogPage.jsx
import { useEffect, useState } from 'react'
import PageHeader from '@/components/admin/PageHeader'
import DataTable from '@/components/admin/DataTable'
import { adminService } from '@/services/adminService'

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminService.getActivityLogs({ per_page: 20 }).then(d => {
      setLogs(d.data || [])
      setLoading(false)
    }).catch(e => {
      console.error(e)
      setLoading(false)
    })
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader title="Activity Log" subtitle="System activity and user actions" />
      <DataTable
        columns={[
          { key: 'user_type', label: 'User Type' },
          { key: 'action', label: 'Action' },
          { key: 'description', label: 'Description' },
          { key: 'ip_address', label: 'IP Address' },
          { key: 'created_at', label: 'Timestamp', render: (d) => new Date(d).toLocaleString() },
        ]}
        data={logs}
        loading={loading}
      />
    </div>
  )
}