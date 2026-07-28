// i-peso-frontend/src/pages/admin/programs/ProgramApplicantsPage.jsx
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import PageHeader from '@/pages/admin/_components/PageHeader'
import DataTable from '@/pages/admin/_components/DataTable'
import StatusBadge from '@/pages/admin/_components/StatusBadge'
import { adminService } from '@/services/adminService'

export default function ProgramApplicantsPage() {
  const { id: programId } = useParams()
  const navigate = useNavigate()

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'programApplicants', programId],
    queryFn: () => adminService.getProgramApplicants(programId),
  })

  const applicants = data?.data || []
  const errorMessage = isError ? (error?.response?.data?.message ?? 'Unable to load applicants.') : ''

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <PageHeader title="Program Applicants" />
        <button onClick={() => navigate('/admin/government-programs')} className="text-sm font-medium text-slate-600">← Back</button>
      </div>
      <DataTable
        columns={[
          { key: 'seeker', label: 'Seeker Name', render: (_, row) => row.seeker?.first_name + ' ' + row.seeker?.last_name },
          { key: 'seeker', label: 'Email', render: (_, row) => row.seeker?.email },
          { key: 'status', label: 'Status', render: (s) => <StatusBadge status={s} /> },
          { key: 'created_at', label: 'Applied', render: (d) => new Date(d).toLocaleDateString() },
        ]}
        data={applicants}
        loading={isLoading}
        error={errorMessage || null}
        onRetry={refetch}
        caption="Applicants for this government program."
        emptyTitle="No applicants yet"
        emptyDescription="Seekers who apply to this program will appear here."
      />
    </div>
  )
}
