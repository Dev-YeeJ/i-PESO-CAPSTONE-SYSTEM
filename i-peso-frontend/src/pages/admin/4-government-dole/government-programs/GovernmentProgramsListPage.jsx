// i-peso-frontend/src/pages/admin/programs/ProgramsListPage.jsx
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Pencil, Trash2, Users } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { ConfirmModal, PageHeader, StatusBadge } from '@/pages/admin/_components'
import DataTable from '@/pages/admin/_components/DataTable'
import { adminService } from '@/services/adminService'

export default function ProgramsListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [pendingDelete, setPendingDelete] = useState(null)

  const programsQuery = useQuery({
    queryKey: ['programs', { per_page: 15 }],
    queryFn: () => adminService.getProgramsList({ per_page: 15 }),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })

  const removeProgram = useMutation({
    mutationFn: (programId) => adminService.deleteProgram(programId),
    onSuccess: () => {
      toast.success('Program deleted.')
      setPendingDelete(null)
      queryClient.invalidateQueries({ queryKey: ['programs'] })
    },
    onError: (caught) => toast.error(
      caught?.response?.data?.message ?? 'Unable to delete this program.',
    ),
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
            { key: 'schedule', label: 'Schedule', render: (d) => (d ? new Date(d).toLocaleDateString() : '—') },
            { key: 'status', label: 'Status', render: (s) => <StatusBadge status={s} /> },
            {
              key: 'actions',
              label: 'Actions',
              render: (_value, row) => (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Users}
                    onClick={() => navigate(`/admin/government-programs/${row.program_id}/applicants`)}
                  >
                    Applicants
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Pencil}
                    onClick={() => navigate(`/admin/government-programs/${row.program_id}/edit`)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={Trash2}
                    onClick={() => setPendingDelete(row)}
                  >
                    Delete
                  </Button>
                </div>
              ),
            },
          ]}
          data={programs}
          loading={loading}
          error={errorMessage || null}
          onRetry={programsQuery.refetch}
          caption="Government programs directory."
          emptyTitle="No programs yet"
          emptyDescription="Create a government program to get started."
        />
      </Card>

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        isDangerous
        title="Delete this program?"
        message={`"${pendingDelete?.program_name ?? 'This program'}" and its applicant records will no longer be available in the portal. This cannot be undone.`}
        confirmText="Delete program"
        loading={removeProgram.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => removeProgram.mutate(pendingDelete.program_id)}
      />
    </div>
  )
}
