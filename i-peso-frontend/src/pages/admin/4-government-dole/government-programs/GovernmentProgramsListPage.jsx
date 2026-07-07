// i-peso-frontend/src/pages/admin/programs/ProgramsListPage.jsx
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import DataTable from '@/pages/admin/_components/DataTable'
import StatusBadge from '@/pages/admin/_components/StatusBadge'
import { adminService } from '@/services/adminService'

export default function ProgramsListPage() {
  const navigate = useNavigate()
  const programsQuery = useQuery({
    queryKey: ['programs', { per_page: 15 }],
    queryFn: () => adminService.getProgramsList({ per_page: 15 }),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })

  const programs = programsQuery.data?.data ?? []
  const loading = programsQuery.isLoading
  const errorMessage = programsQuery.isError
    ? programsQuery.error?.response?.data?.message ?? 'Unable to load programs.'
    : ''

  return (
    <div className="portal-page">
      <PageHeader
        title="Government Programs"
        subtitle="Manage SPES, TUPAD, and other government initiatives."
        eyebrow="Government & DOLE"
        actions={[{ label: 'Create Program', onClick: () => navigate('/admin/government-programs/create'), variant: 'primary' }]}
      />

      <Card padding="none" className="mt-6">
        <div className="p-5 sm:p-6 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Programs Directory</h2>
            <p className="text-sm text-slate-500">View and manage all active and past government programs.</p>
          </div>
        </div>
        <DataTable
          columns={[
            { key: 'program_name', label: 'Program Name' },
            { key: 'target_beneficiaries', label: 'Beneficiaries' },
            { key: 'slot_limit', label: 'Slots' },
            { key: 'schedule', label: 'Schedule', render: (d) => new Date(d).toLocaleDateString() },
            { key: 'status', label: 'Status', render: (s) => <StatusBadge status={s} /> },
          ]}
          data={programs}
          loading={loading}
          onRowClick={(row) => navigate(`/admin/government-programs/${row.program_id}/applicants`)}
        />
      </Card>
    </div>
  )
}
