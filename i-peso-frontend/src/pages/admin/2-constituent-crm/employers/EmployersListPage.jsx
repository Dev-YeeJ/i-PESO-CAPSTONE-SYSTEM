import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Building2, MapPin, Briefcase, FileText } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import StatusBadge from '@/pages/admin/_components/StatusBadge'
import { adminService } from '@/services/adminService'

export default function EmployersListPage() {
  const [employers, setEmployers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const navigate = useNavigate()

  const loadEmployers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await adminService.getEmployers({ 
        per_page: 100, 
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined
      })
      setEmployers(result.data ?? [])
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to load employers.')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, typeFilter])

  useEffect(() => {
    const timer = window.setTimeout(loadEmployers, 250)
    return () => window.clearTimeout(timer)
  }, [loadEmployers])

  return (
    <div className="-mx-4 -mt-8 bg-slate-50 pb-12 min-h-screen sm:-mx-6">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <PageHeader
            title="Employer Directory"
            subtitle="Audit companies, verify business legitimacy, and manage DOLE compliance."
            eyebrow="Constituent CRM"
          />
          <Button to="/admin/verification-queue" variant="primary">Open Verification Queue</Button>
        </div>

        {/* Smart Filter Bar */}
        <Card padding="none" className="mt-8 mb-8 overflow-hidden bg-white shadow-sm border-slate-200">
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="flex-1 p-4 flex items-center gap-3">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company name, HR representative, or email..."
              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm"
            />
          </div>
          <div className="p-4 flex items-center gap-3 md:w-64">
            <Filter className="h-4 w-4 text-slate-400" />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm font-medium text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div className="p-4 flex items-center gap-3 md:w-64">
            <Building2 className="h-4 w-4 text-slate-400" />
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm font-medium text-slate-700"
            >
              <option value="all">All Employer Types</option>
              <option value="direct">Direct Employer</option>
              <option value="prpa">PRPA / Agency</option>
            </select>
          </div>
        </div>
      </Card>

      {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {/* Rich Grid Presentation */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading employers...</div>
      ) : employers.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No employers match your criteria.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {employers.map((employer) => (
            <Card key={employer.employer_id} padding="none" className="flex flex-col hover:shadow-lg transition-shadow duration-300">
              {/* Header/Banner Area */}
              <div className="h-24 bg-gradient-to-r from-slate-800 to-slate-900 rounded-t-2xl relative">
                <div className="absolute -bottom-8 left-6">
                  <div className="h-16 w-16 bg-white rounded-xl shadow-md border border-slate-100 flex items-center justify-center font-bold text-xl text-slate-400 overflow-hidden">
                    {employer.logo_url ? (
                      <img src={employer.logo_url} alt={employer.company_name} className="h-full w-full object-cover" />
                    ) : (
                      employer.company_name?.charAt(0) || '?'
                    )}
                  </div>
                </div>
                <div className="absolute top-4 right-4">
                   <StatusBadge status={employer.verification_status ?? 'pending'} />
                </div>
              </div>
              
              {/* Body */}
              <div className="px-6 pt-10 pb-6 flex-1 flex flex-col">
                <h3 className="font-bold text-lg text-slate-900 leading-tight line-clamp-1">{employer.company_name}</h3>
                <p className="text-sm text-slate-500 mt-1 capitalize">{employer.company_type?.replaceAll('_', ' ') || 'Direct Employer'}</p>
                
                <div className="mt-5 space-y-3 flex-1">
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <Briefcase className="h-4 w-4 mt-0.5 shrink-0 text-slate-400" />
                    <span className="line-clamp-1">{employer.industry || 'Industry not specified'}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-slate-400" />
                    <span className="line-clamp-1">{employer.city_municipality || employer.complete_address || 'Location unknown'}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <FileText className="h-4 w-4 mt-0.5 shrink-0 text-slate-400" />
                    <span>{employer.documents_count || 0} Docs Uploaded</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <Button 
                    variant="outline" 
                    className="w-full justify-center"
                    onClick={() => navigate(`/admin/employers/${employer.employer_id}`)}
                  >
                    View Profile & Audit
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
