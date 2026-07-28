import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import DataTable from '@/pages/admin/_components/DataTable'
import { adminService } from '@/services/adminService'

export default function ActivityLogPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'activityLogs'],
    queryFn: () => adminService.getActivityLogs({ per_page: 20 }),
  })

  const logs = data?.data || []
  const errorMessage = isError ? (error?.response?.data?.message ?? 'Unable to load activity logs.') : ''

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
          loading={isLoading}
          error={errorMessage || null}
          onRetry={refetch}
          caption="System activity and audit log."
          emptyTitle="No activity logged yet"
          emptyDescription="System events and user actions will appear here."
        />
      </Card>
    </div>
  )
}
