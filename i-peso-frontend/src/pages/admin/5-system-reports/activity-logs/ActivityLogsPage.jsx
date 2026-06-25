// i-peso-frontend/src/pages/admin/activity/ActivityLogPage.jsx
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import DataTable from '@/pages/admin/_components/DataTable'
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
    <div className="portal-page">
      <PageHeader 
        title="Activity Log" 
        subtitle="Monitor system activity, user actions, and security events." 
        eyebrow="System & Reports"
      />
      
      <Card padding="none" className="mt-6">
        <div className="p-5 sm:p-6 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Security & Audit Logs</h2>
            <p className="text-sm text-slate-500">A chronological record of system events.</p>
          </div>
        </div>
        <DataTable
          columns={[
            { key: 'user_type', label: 'User Type', render: (val) => <span className="capitalize">{val}</span> },
            { key: 'action', label: 'Action' },
            { key: 'description', label: 'Description' },
            { key: 'ip_address', label: 'IP Address' },
            { key: 'created_at', label: 'Timestamp', render: (d) => new Date(d).toLocaleString() },
          ]}
          data={logs}
          loading={loading}
          emptyMessage="No activity logs found."
        />
      </Card>
    </div>
  )
}