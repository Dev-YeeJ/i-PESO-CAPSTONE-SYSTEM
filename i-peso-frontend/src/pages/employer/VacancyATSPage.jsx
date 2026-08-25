import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  CheckSquare, Square, MapPin, GraduationCap, Calendar as CalendarIcon,
  Briefcase, Users, ArrowUpDown, Eye, ArrowLeft, RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getVacancyApplications,
  getEmployerApplicationDetail,
} from '@/services/employerApplicationService'
import { getVacancy } from '@/services/employerService'
import { Badge, Button, EmptyState, ErrorState } from '@/components/ui'
import { PIPELINE_TABS, SORT_OPTIONS, PAGE_SIZE_OPTIONS, TERMINAL_STATUSES } from './ats/atsConstants'
import { formatDate, getInitials, getMatchTone, timeAgo } from './ats/atsFormatters'
import useDebouncedValue from './ats/useDebouncedValue'
import useApplicationStatusActions from './ats/useApplicationStatusActions'
import ApplicantProfileModal from './ats/ApplicantProfileModal'
import InterviewModal from './ats/InterviewModal'
import HireModal from './ats/HireModal'
import RejectModal from './ats/RejectModal'

export default function VacancyATSPage() {
  const { vacancyId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebouncedValue(searchQuery, 300)
  const [sortBy, setSortBy] = useState('match_score')
  const [sortDir, setSortDir] = useState('desc')
  const [pageSize, setPageSize] = useState(25)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [activeModal, setActiveModal] = useState(null)
  const [modalTargets, setModalTargets] = useState([])
  const [detailApplication, setDetailApplication] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const { isSubmitting, runStatusChange } = useApplicationStatusActions({
    invalidateKeys: [['vacancyApplications'], ['vacancyATSCounts']],
  })

  const vacancyQuery = useQuery({
    queryKey: ['vacancy', vacancyId],
    queryFn: () => getVacancy(vacancyId),
    staleTime: 1000 * 60 * 5,
    enabled: !!vacancyId,
  })
  const vacancy = vacancyQuery.data

  const applicationsQuery = useQuery({
    queryKey: ['vacancyApplications', vacancyId, activeTab, debouncedSearch, sortBy, sortDir, pageSize, currentPage],
    queryFn: () => getVacancyApplications(vacancyId, {
      status: activeTab,
      search: debouncedSearch || undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
      per_page: pageSize,
      page: currentPage,
    }),
    staleTime: 1000 * 30,
    refetchInterval: 30000,
    enabled: !!vacancyId,
  })

  const applications = applicationsQuery.data?.data || []
  const totalItems = applicationsQuery.data?.total || 0
  const totalPages = applicationsQuery.data?.last_page || 1
  const fromItem = applicationsQuery.data?.from || 0
  const toItem = applicationsQuery.data?.to || 0

  const countsQuery = useQuery({
    queryKey: ['vacancyATSCounts', vacancyId],
    queryFn: async () => {
      const results = await Promise.all(
        PIPELINE_TABS.map((tab) => getVacancyApplications(vacancyId, { status: tab.id, per_page: 1 })),
      )
      const counts = {}
      PIPELINE_TABS.forEach((tab, i) => { counts[tab.id] = results[i]?.total || 0 })
      return counts
    },
    staleTime: 1000 * 30,
    refetchInterval: 30000,
    enabled: !!vacancyId,
  })
  const tabCounts = countsQuery.data || {}
  const totalApplicants = Object.values(tabCounts).reduce((a, b) => a + b, 0)

  const toggleSelectAll = () => {
    setSelectedIds((current) => (
      current.size === applications.length && applications.length > 0
        ? new Set()
        : new Set(applications.map((app) => app.apply_id))
    ))
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const closeModal = () => {
    setActiveModal(null)
    setModalTargets([])
    setDetailApplication(null)
  }

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['vacancyApplications'] })
    queryClient.invalidateQueries({ queryKey: ['vacancyATSCounts'] })
  }

  const openProfileModal = async (app) => {
    setDetailLoading(true)
    setDetailApplication(null)
    setModalTargets([app])
    setActiveModal('profile')
    try {
      const data = await getEmployerApplicationDetail(app.apply_id)
      setDetailApplication(data.application)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load applicant details.')
      closeModal()
    } finally {
      setDetailLoading(false)
    }
  }

  const openBulkModal = (status) => {
    const targets = applications.filter((a) => selectedIds.has(a.apply_id))
    if (!targets.length) return
    setModalTargets(targets)
    if (status === 'interview') setActiveModal('interview')
    else if (status === 'hired') setActiveModal('hire')
    else if (status === 'rejected') setActiveModal('reject')
    else runStatusChange(status, targets).then(({ success }) => success && setSelectedIds(new Set()))
  }

  const handleModalSubmit = async (extraPayload) => {
    const { success } = await runStatusChange(activeModal === 'interview' ? 'interview' : activeModal === 'hire' ? 'hired' : 'rejected', modalTargets, extraPayload)
    if (success) {
      closeModal()
      setSelectedIds(new Set())
    }
  }

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    setSelectedIds(new Set())
  }

  if (vacancyQuery.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm font-medium text-slate-500">Loading vacancy details...</p>
        </div>
      </div>
    )
  }

  if (vacancyQuery.isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <ErrorState
          title="Vacancy not found"
          description="This vacancy doesn't exist or you don't have permission to view it."
          error={vacancyQuery.error}
        />
        <div className="mt-4">
          <Button icon={ArrowLeft} onClick={() => navigate('/employer/vacancies')}>Back to vacancies</Button>
        </div>
      </div>
    )
  }

  const singleTargetInterview = modalTargets.length === 1 ? modalTargets[0].interview : null
  const isTerminalTab = TERMINAL_STATUSES.includes(activeTab)

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <button onClick={() => navigate('/employer/vacancies')} className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to vacancies
          </button>
          <button onClick={refresh} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" title="Refresh data">
            <RefreshCw className={`h-4 w-4 ${applicationsQuery.isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{vacancy?.job_title}</h1>
            <Badge status={vacancy?.status} icon={false} className="uppercase tracking-wider">{vacancy?.status}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
            {vacancy?.location && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{vacancy.location}</span>}
            {vacancy?.employment_type && <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />{vacancy.employment_type}</span>}
            {vacancy?.vacancies_count !== undefined && <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{vacancy.vacancies_count} opening{vacancy.vacancies_count !== 1 ? 's' : ''}</span>}
            {vacancy?.application_deadline && <span className="flex items-center gap-1.5 font-medium text-amber-600"><CalendarIcon className="h-3.5 w-3.5" />Deadline: {formatDate(vacancy.application_deadline)}</span>}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{totalApplicants}</p>
            </div>
            {PIPELINE_TABS.map((tab) => {
              const count = tabCounts[tab.id] || 0
              const TabIcon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setCurrentPage(1); setSelectedIds(new Set()) }}
                  className={`rounded-xl border px-4 py-3 text-left transition-all hover:shadow-sm ${activeTab === tab.id ? 'border-blue-200 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                >
                  <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-400"><TabIcon className="h-3 w-3" />{tab.label}</p>
                  <p className={`mt-1 text-2xl font-extrabold ${activeTab === tab.id ? 'text-blue-700' : 'text-slate-900'}`}>{count}</p>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="no-scrollbar flex overflow-x-auto border-b border-slate-200">
          {PIPELINE_TABS.map((tab) => {
            const TabIcon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setCurrentPage(1); setSelectedIds(new Set()) }}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3.5 text-sm font-semibold transition-all ${activeTab === tab.id ? 'border-blue-600 bg-blue-50/40 text-blue-700' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}
              >
                <TabIcon className="h-4 w-4" />
                {tab.label}
                <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{tabCounts[tab.id] || 0}</span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col items-stretch justify-between gap-3 border-b border-slate-100 px-5 py-3 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, skills, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => {
                  const opt = SORT_OPTIONS.find((o) => o.value === e.target.value)
                  setSortBy(opt.value); setSortDir(opt.dir); setCurrentPage(1)
                }}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm focus:ring-2 focus:ring-blue-500"
              >
                {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Show</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm focus:ring-2 focus:ring-blue-500"
              >
                {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>
            <Button to="/employer/calendar" variant="outline" size="sm" icon={CalendarIcon}>
              <span className="hidden sm:inline">Calendar</span>
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="w-12 px-4 py-3 text-center">
                  {!isTerminalTab && (
                    <button onClick={toggleSelectAll} className="text-slate-400 transition-colors hover:text-slate-600">
                      {selectedIds.size === applications.length && applications.length > 0 ? <CheckSquare className="h-4.5 w-4.5 text-blue-600" /> : <Square className="h-4.5 w-4.5" />}
                    </button>
                  )}
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Candidate</th>
                <th className="w-28 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Match</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Skills</th>
                <th className="hidden px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 lg:table-cell">Education</th>
                <th className="hidden px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 md:table-cell">Location</th>
                <th className="w-28 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Applied</th>
                <th className="w-20 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applicationsQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-4 w-4 rounded bg-slate-200" /></td>
                    <td className="px-4 py-4"><div className="flex gap-3"><div className="h-10 w-10 rounded-full bg-slate-200" /><div className="space-y-2"><div className="h-4 w-32 rounded bg-slate-200" /><div className="h-3 w-24 rounded bg-slate-100" /></div></div></td>
                    <td className="px-4 py-4"><div className="h-6 w-20 rounded-md bg-slate-200" /></td>
                    <td className="px-4 py-4"><div className="flex gap-1"><div className="h-5 w-16 rounded bg-slate-200" /><div className="h-5 w-14 rounded bg-slate-200" /></div></td>
                    <td className="hidden px-4 py-4 lg:table-cell"><div className="h-4 w-28 rounded bg-slate-200" /></td>
                    <td className="hidden px-4 py-4 md:table-cell"><div className="h-4 w-24 rounded bg-slate-200" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-16 rounded bg-slate-200" /></td>
                    <td className="px-4 py-4"><div className="mx-auto h-6 w-6 rounded bg-slate-200" /></td>
                  </tr>
                ))
              ) : applicationsQuery.isError ? (
                <tr><td colSpan={8} className="py-10"><ErrorState size="sm" error={applicationsQuery.error} onRetry={() => applicationsQuery.refetch()} /></td></tr>
              ) : applications.length === 0 ? (
                <tr><td colSpan={8}>
                  <EmptyState
                    icon={Users}
                    title="No candidates in this stage"
                    description={debouncedSearch ? 'Try adjusting your search query.' : 'Candidates will appear here when they apply.'}
                    filtered={Boolean(debouncedSearch)}
                  />
                </td></tr>
              ) : (
                applications.map((app) => {
                  const isSelected = selectedIds.has(app.apply_id)
                  const seeker = app.seeker || {}
                  const skills = seeker.skills || []
                  const topSkills = skills.slice(0, 3)

                  return (
                    <tr key={app.apply_id} className={`group transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'}`}>
                      <td className="px-4 py-3.5 text-center">
                        {!isTerminalTab && (
                          <button onClick={() => toggleSelect(app.apply_id)} className="text-slate-400 transition-colors hover:text-blue-600">
                            {isSelected ? <CheckSquare className="h-4.5 w-4.5 text-blue-600" /> : <Square className="h-4.5 w-4.5" />}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
                            {getInitials(seeker.name)}
                          </div>
                          <div className="min-w-0">
                            <button onClick={() => openProfileModal(app)} className="block max-w-[200px] truncate text-left text-sm font-bold text-slate-900 transition-colors hover:text-blue-600">
                              {seeker.name}
                            </button>
                            <p className="max-w-[200px] truncate text-xs text-slate-500">{seeker.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${getMatchTone(app.match_percentage)}`}>
                          {parseFloat(app.match_percentage).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {topSkills.map((s, i) => <span key={i} className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{s}</span>)}
                          {skills.length > 3 && <span className="inline-block rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-400">+{skills.length - 3}</span>}
                          {skills.length === 0 && <span className="text-xs italic text-slate-400">No skills</span>}
                        </div>
                      </td>
                      <td className="hidden px-4 py-3.5 lg:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <GraduationCap className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="max-w-[150px] truncate">{seeker.educ_attainment || 'Not specified'}</span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3.5 md:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="max-w-[140px] truncate">{seeker.address || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-sm text-slate-600">
                          <span className="flex items-center gap-1.5"><CalendarIcon className="h-3.5 w-3.5 text-slate-400" />{timeAgo(app.applied_at)}</span>
                          <p className="mt-0.5 text-xs text-slate-400">{formatDate(app.applied_at)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button onClick={() => openProfileModal(app)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="View profile">
                            <Eye className="h-4 w-4" />
                          </button>
                          {activeTab === 'interview' && (
                            <Link to="/employer/calendar" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600" title="View in calendar">
                              <CalendarIcon className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 0 && applications.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-3 sm:flex-row">
            <p className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-700">{fromItem}</span> – <span className="font-semibold text-slate-700">{toItem}</span> of <span className="font-semibold text-slate-700">{totalItems}</span> applicants
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"><ChevronsLeft className="h-4 w-4" /></button>
              <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
              {(() => {
                const start = Math.max(1, currentPage - 2)
                const end = Math.min(totalPages, currentPage + 2)
                const pages = []
                for (let i = start; i <= end; i++) {
                  pages.push(
                    <button key={i} onClick={() => goToPage(i)} className={`h-9 min-w-[36px] rounded-lg text-sm font-semibold transition-colors ${i === currentPage ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}>{i}</button>,
                  )
                }
                return pages
              })()}
              <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
              <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"><ChevronsRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 animate-in fade-in slide-in-from-bottom-5 items-center gap-6 rounded-2xl border border-slate-700/50 bg-slate-900 px-6 py-4 text-white shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{selectedIds.size}</div>
            <span className="whitespace-nowrap text-sm font-semibold">Selected</span>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-xs text-slate-400">Move to:</span>
            {activeTab !== 'reviewed' && <button onClick={() => openBulkModal('reviewed')} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800">Reviewed</button>}
            {activeTab !== 'shortlisted' && <button onClick={() => openBulkModal('shortlisted')} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800">Shortlist</button>}
            <button onClick={() => openBulkModal('interview')} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500">Interview</button>
            <button onClick={() => openBulkModal('hired')} className="ml-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500">Hire</button>
            <button onClick={() => openBulkModal('rejected')} className="ml-1 rounded-lg px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-950/30">Reject</button>
          </div>
        </div>
      )}

      <ApplicantProfileModal
        open={activeModal === 'profile'}
        onClose={closeModal}
        application={modalTargets[0]}
        detail={detailApplication}
        loading={detailLoading}
        jobTitle={vacancy?.job_title}
        onScheduleInterview={(app) => { setModalTargets([app]); setActiveModal('interview') }}
      />
      <InterviewModal
        open={activeModal === 'interview'}
        onClose={closeModal}
        targets={modalTargets}
        initialInterview={singleTargetInterview}
        isSubmitting={isSubmitting}
        onSubmit={handleModalSubmit}
      />
      <HireModal
        open={activeModal === 'hire'}
        onClose={closeModal}
        targets={modalTargets}
        isSubmitting={isSubmitting}
        onSubmit={handleModalSubmit}
      />
      <RejectModal
        open={activeModal === 'reject'}
        onClose={closeModal}
        targets={modalTargets}
        isSubmitting={isSubmitting}
        onSubmit={handleModalSubmit}
      />
    </div>
  )
}
