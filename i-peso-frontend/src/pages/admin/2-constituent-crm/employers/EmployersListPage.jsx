import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card } from '@/components/ui'
import DataTable from '@/pages/admin/_components/DataTable'
import PageHeader from '@/pages/admin/_components/PageHeader'
import StatusBadge from '@/pages/admin/_components/StatusBadge'
import { adminService } from '@/services/adminService'

export default function EmployersListPage() {
  const [employers, setEmployers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const loadEmployers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await adminService.getEmployers({ per_page: 100, search: search || undefined })
      setEmployers(result.data ?? [])
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to load employers.')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = window.setTimeout(loadEmployers, 250)
    return () => window.clearTimeout(timer)
  }, [loadEmployers])

  return (
    <div className="portal-page">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <PageHeader
          title="Employer Directory"
          subtitle="Search and manage all registered employers across every accreditation status."
        />
        <Button to="/admin/verification-queue" variant="accent">Open Verification Queue</Button>
      </div>

      <Card padding="sm">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="employer-search">Search employers</label>
        <input
          id="employer-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Company name, representative, or email"
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500"
        />
      </Card>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <DataTable
        columns={[
          {
            key: 'company_name',
            label: 'Company',
            render: (name, row) => (
              <div>
                <p className="font-bold text-slate-950">{name}</p>
                <p className="text-xs capitalize text-slate-500">{row.company_type?.replaceAll('_', ' ') || 'Company type not specified'}</p>
              </div>
            ),
          },
          { key: 'representative_name', label: 'Representative' },
          { key: 'email', label: 'Email' },
          { key: 'documents_count', label: 'Documents' },
          {
            key: 'verification_status',
            label: 'Accreditation',
            render: (status) => <StatusBadge status={status ?? 'pending'} />,
          },
          {
            key: 'created_at',
            label: 'Registered',
            render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A',
          },
        ]}
        data={employers}
        loading={loading}
        emptyMessage="No employers found."
        onRowClick={(row) => navigate(`/admin/employers/${row.employer_id}`)}
      />
    </div>
  )
}
