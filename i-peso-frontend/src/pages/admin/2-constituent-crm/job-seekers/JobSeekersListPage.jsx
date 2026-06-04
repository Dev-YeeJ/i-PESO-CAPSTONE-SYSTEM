// i-peso-frontend/src/pages/admin/seekers/SeekersListPage.jsx

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/pages/admin/_components/PageHeader'
import DataTable from '@/pages/admin/_components/DataTable'
import StatusBadge from '@/pages/admin/_components/StatusBadge'
import { adminService } from '@/services/adminService'

export default function SeekersListPage() {
  const [seekers, setSeekers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchSeekers = async () => {
      try {
        setLoading(true)
        const params = {
          page,
          per_page: 15,
          search: search || undefined,
        }
        const data = await adminService.getSeekers(params)
        setSeekers(data.data || [])
        setError(null)
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load seekers')
        console.error('Seekers error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSeekers()
  }, [page, search])

  const handleSearch = useCallback((e) => {
    setSearch(e.target.value)
    setPage(1)
  }, [])

  const handleRowClick = useCallback((row) => {
    navigate(`/admin/job-seekers/${row.seeker_id}`)
  }, [navigate])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Seekers"
        subtitle="Manage and verify all registered job seekers"
      />

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={handleSearch}
          className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={[
          { key: 'first_name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'mobile_number', label: 'Mobile' },
          { key: 'educ_attainment', label: 'Education' },
          { key: 'address_province', label: 'Province' },
          {
            key: 'profile_completed',
            label: 'Status',
            render: (val) => val ? <StatusBadge status="completed" /> : <StatusBadge status="pending" />,
          },
          {
            key: 'created_at',
            label: 'Registered',
            render: (date) => new Date(date).toLocaleDateString(),
          },
        ]}
        data={seekers}
        loading={loading}
        onRowClick={handleRowClick}
        emptyMessage="No seekers found"
      />
    </div>
  )
}