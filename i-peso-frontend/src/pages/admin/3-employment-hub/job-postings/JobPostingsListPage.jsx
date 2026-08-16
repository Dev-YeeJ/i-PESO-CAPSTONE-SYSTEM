import { useCallback, useEffect, useState } from 'react'
import { BriefcaseBusiness, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import DataTable from '@/pages/admin/_components/DataTable'
import { adminService } from '@/services/adminService'

export default function JobPostingsListPage() {
  const navigate = useNavigate()
  const [vacancies, setVacancies] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState(null)
  
  const [filters, setFilters] = useState({
    page: 1,
    search: '',
    status: '',
  })
  
  const [searchInput, setSearchInput] = useState('')

  const fetchVacancies = useCallback(async () => {
    setLoading(true)
    try {
      const response = await adminService.getJobVacancies(filters)
      setVacancies(response.data)
      setPagination({
        current_page: response.current_page,
        last_page: response.last_page,
        total: response.total,
        per_page: response.per_page,
      })
    } catch (error) {
      console.error('Failed to fetch vacancies', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchVacancies()
  }, [fetchVacancies])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }))
  }

  const columns = [
    { 
      key: 'job_title', 
      label: 'Job Title',
      render: (value, row) => (
        <div>
          <div className="font-bold text-slate-900">{value}</div>
          <div className="text-xs text-slate-500">{row.general_term || row.occupation?.title || 'Uncategorized'}</div>
        </div>
      )
    },
    { 
      key: 'employer', 
      label: 'Employer',
      render: (_, row) => (
        <div>
          <div className="font-medium text-slate-900">{row.employer?.company_profile?.company_name || 'N/A'}</div>
          <div className="text-xs text-slate-500">{row.employer?.company_profile?.trade_name || ''}</div>
        </div>
      )
    },
    { 
      key: 'employment_type', 
      label: 'Type / Setup',
      render: (value, row) => (
        <div>
          <div className="text-sm font-medium text-slate-900">{value}</div>
          <div className="text-xs text-slate-500">{row.work_setup}</div>
        </div>
      )
    },
    { 
      key: 'vacancies_count', 
      label: 'Positions',
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => {
        const colors = {
          active: 'bg-emerald-100 text-emerald-800',
          closed: 'bg-slate-100 text-slate-800',
          draft: 'bg-amber-100 text-amber-800',
        }
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${colors[value] || 'bg-slate-100 text-slate-800'}`}>
            {value}
          </span>
        )
      },
    },
    { 
      key: 'created_at', 
      label: 'Date Posted',
      render: (value) => new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <div className="text-right">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/job-postings/${row.post_id}`)}>
            View Details
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="portal-page">
      <PageHeader
        title="Job Postings"
        subtitle="Monitor and oversee all job vacancies posted by accredited employers."
        eyebrow="Employment Hub"
      />
      
      <div className="mt-6">
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search job title or employer..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </form>
            
            <div className="flex items-center gap-3">
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
          
          <DataTable 
            columns={columns} 
            data={vacancies} 
            loading={loading} 
          />
          
          {pagination && pagination.last_page > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <Button
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.current_page === 1}
                  variant="outline"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.current_page === pagination.last_page}
                  variant="outline"
                >
                  Next
                </Button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-700">
                    Showing <span className="font-medium">{(pagination.current_page - 1) * pagination.per_page + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(pagination.current_page * pagination.per_page, pagination.total)}</span> of{' '}
                    <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.current_page === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                    >
                      <span className="sr-only">Previous</span>
                      Previous
                    </button>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.current_page === pagination.last_page}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                    >
                      <span className="sr-only">Next</span>
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}