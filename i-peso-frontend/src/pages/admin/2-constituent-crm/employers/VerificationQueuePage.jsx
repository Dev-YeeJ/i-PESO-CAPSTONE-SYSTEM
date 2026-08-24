import { createElement, useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AlarmClock, Building2, CheckCircle2, FileSearch, FileWarning, ShieldCheck } from 'lucide-react'
import { Badge, Button, Card, ErrorState, LoadingSkeleton, StatCard } from '@/components/ui'
import { ConfirmModal, PageHeader } from '@/pages/admin/_components'
import { adminService } from '@/services/adminService'

const PER_PAGE = 12

export default function VerificationQueuePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [readiness, setReadiness] = useState('')
  const [sort, setSort] = useState('oldest')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState([])
  const [confirming, setConfirming] = useState(false)

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'pendingEmployers', appliedSearch, readiness, sort, page],
    queryFn: () => adminService.getPendingEmployers({
      search: appliedSearch,
      readiness,
      sort,
      page,
      per_page: PER_PAGE,
    }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  // The API returns the queue oldest-first; within a page, employers an officer
  // can act on immediately are surfaced above those still awaiting documents.
  const employers = useMemo(
    () => [...(data?.employers ?? [])].sort(
      (a, b) => Number(b.all_required_approved) - Number(a.all_required_approved),
    ),
    [data],
  )
  const summary = data?.summary ?? {}
  const pagination = data?.pagination ?? {}

  const readyIds = useMemo(
    () => employers.filter((employer) => employer.all_required_approved).map((e) => e.employer_id),
    [employers],
  )
  const allReadySelected = readyIds.length > 0 && readyIds.every((id) => selected.includes(id))

  const bulkApprove = useMutation({
    mutationFn: (remarks) => adminService.bulkApproveEmployers(selected, remarks),
    onSuccess: (result) => {
      const failed = result?.failed ?? []
      if (failed.length) {
        toast.error(result.message ?? `${failed.length} employer(s) could not be approved.`)
      } else {
        toast.success(result?.message ?? 'Employers approved.')
      }
      setConfirming(false)
      setSelected([])
      queryClient.invalidateQueries({ queryKey: ['admin', 'pendingEmployers'] })
    },
    onError: (caught) => toast.error(
      caught?.response?.data?.message ?? caught?.response?.data?.error ?? 'Bulk approval failed.',
    ),
  })

  const applyFilters = (nextReadiness = readiness, nextSort = sort, nextSearch = search) => {
    setAppliedSearch(nextSearch)
    setReadiness(nextReadiness)
    setSort(nextSort)
    setPage(1)
    setSelected([])
  }

  const toggle = (id) =>
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))

  const errorMessage = error?.response?.data?.message
    ?? error?.response?.data?.error
    ?? 'Unable to load the employer verification queue.'

  return (
    <div className="portal-page">
      <PageHeader
        eyebrow="Employer Accreditation"
        title="Verification Queue"
        subtitle="Review pending employer registrations and their required legal documents."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} color="blue" label="Pending employers" value={count(summary.pending)} />
        <StatCard
          icon={CheckCircle2}
          color="green"
          label="Ready to approve"
          value={count(summary.ready_to_approve)}
          hint="Every required document has been approved — these can be accredited now."
        />
        <StatCard
          icon={FileWarning}
          color="amber"
          label="Awaiting documents"
          value={count(summary.awaiting_documents)}
          hint="The employer has not uploaded all required documents yet."
        />
        <StatCard
          icon={AlarmClock}
          color="red"
          label="Waiting 7+ days"
          value={count(summary.waiting_over_7_days)}
          hint="Applications that have been in the queue a week or longer."
        />
      </div>

      <Card padding="none" className="mt-6">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Pending applications</h2>
            <p className="text-sm text-slate-500">Worked oldest-first by default so nothing is left waiting.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-bold text-slate-600">Search</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && applyFilters()}
                placeholder="Company, email or representative"
                className={inputClass}
              />
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-bold text-slate-600">Readiness</span>
              <select
                value={readiness}
                onChange={(event) => applyFilters(event.target.value)}
                className={inputClass}
              >
                <option value="">All</option>
                <option value="ready">Ready to approve</option>
                <option value="awaiting">Awaiting document review</option>
              </select>
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-bold text-slate-600">Sort</span>
              <select
                value={sort}
                onChange={(event) => applyFilters(readiness, event.target.value)}
                className={inputClass}
              >
                <option value="oldest">Longest waiting</option>
                <option value="newest">Newest first</option>
              </select>
            </label>
            <Button size="sm" onClick={() => applyFilters()} disabled={isFetching}>Apply</Button>
          </div>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100 bg-brand-50/60 px-5 py-3 sm:px-6">
            <p className="text-sm font-bold text-slate-800">{selected.length} selected for accreditation</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="success"
                icon={CheckCircle2}
                disabled={bulkApprove.isPending}
                onClick={() => setConfirming(true)}
              >
                Approve selected
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected([])} disabled={bulkApprove.isPending}>
                Clear
              </Button>
            </div>
          </div>
        )}

        <div className="p-5 sm:p-6">
          {isFetching && !data ? (
            <LoadingSkeleton variant="card" rows={4} />
          ) : isError ? (
            <ErrorState description={errorMessage} onRetry={refetch} error={error} />
          ) : employers.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-bold text-slate-950">
                {appliedSearch || readiness ? 'No employers match your filters' : 'Employer queue is clear'}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {appliedSearch || readiness
                  ? 'Try clearing the search or readiness filter.'
                  : 'No employer accreditation applications are waiting for review.'}
              </p>
            </div>
          ) : (
            <>
              {readyIds.length > 0 && (
                <label className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={allReadySelected}
                    onChange={() => setSelected(allReadySelected ? [] : readyIds)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Select all {readyIds.length} ready for approval on this page
                </label>
              )}

              <div className="grid gap-5 lg:grid-cols-2">
                {employers.map((employer) => {
                  const required = Number(employer.required_documents_count) || 0
                  const approved = Number(employer.approved_required_documents_count) || 0
                  const pending = Number(employer.pending_required_documents_count) || 0
                  const reviewable = approved + pending
                  const progress = required ? (reviewable / required) * 100 : 0
                  const waitingDays = Number(employer.days_waiting) || 0
                  const waitingHours = Number(employer.hours_waiting) || 0

                  return (
                    <Card key={employer.employer_id} interactive>
                      <div className="flex items-start gap-4">
                        <span className="rounded-2xl bg-brand-50 p-3 text-brand-700"><Building2 className="h-6 w-6" /></span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-bold text-slate-950">{employer.company_name || 'Unnamed company'}</h3>
                              <p className="mt-1 truncate text-sm text-slate-500">{employer.email}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              {employer.is_resubmission && (
                                <Badge variant="warning">Resubmission</Badge>
                              )}
                              <Badge variant={employer.all_required_approved ? 'reviewed' : 'pending'}>
                                {employer.all_required_approved ? 'Ready for decision' : 'Document review'}
                              </Badge>
                              {waitingDays >= 7 && (
                                <Badge variant="warning">Waiting {waitingDays} day{waitingDays === 1 ? '' : 's'}</Badge>
                              )}
                            </div>
                          </div>

                          <div className="mt-5 grid grid-cols-2 gap-3">
                            <QueueFact
                              icon={FileSearch}
                              label="Required documents"
                              value={`${reviewable}/${required} submitted`}
                              progress={progress}
                            />
                            <QueueFact
                              icon={ShieldCheck}
                              label="Waiting"
                              value={formatWaiting(waitingDays, waitingHours)}
                            />
                          </div>

                          {employer.rejected_documents_count > 0 && (
                            <p className="mt-3 text-xs font-semibold text-red-600">
                              {employer.rejected_documents_count} document(s) rejected — the employer must resubmit.
                            </p>
                          )}

                          <div className="mt-5 flex flex-wrap items-center gap-3">
                            {employer.all_required_approved && (
                              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={selected.includes(employer.employer_id)}
                                  onChange={() => toggle(employer.employer_id)}
                                  aria-label={`Select ${employer.company_name} for bulk approval`}
                                  className="h-4 w-4 rounded border-slate-300"
                                />
                                Select
                              </label>
                            )}
                            <Button
                              onClick={() => navigate(`/admin/employers/${employer.employer_id}`)}
                              variant={employer.all_required_approved ? 'primary' : 'secondary'}
                              className="flex-1"
                            >
                              Review employer and documents
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {pagination.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 p-4">
            <p className="text-xs text-slate-500">
              Page {pagination.current_page} of {pagination.last_page} · {count(pagination.total)} pending
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={isFetching || pagination.current_page <= 1} onClick={() => setPage((current) => current - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="outline" disabled={isFetching || pagination.current_page >= pagination.last_page} onClick={() => setPage((current) => current + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ConfirmModal
        isOpen={confirming}
        title={`Accredit ${selected.length} employer(s)?`}
        message="Each selected employer will be marked verified, notified by email, and unlocked for job posting. Any that fail a final document check are reported back individually."
        confirmText="Yes, accredit"
        requiresReason
        reasonLabel="Remarks (optional — included in the approval notice)"
        loading={bulkApprove.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={(remarks) => bulkApprove.mutate(remarks || null)}
      />
    </div>
  )
}

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 sm:min-w-44'

function count(value) {
  return Number(value || 0).toLocaleString()
}

function formatWaiting(days, hours) {
  if (days === 0 && hours === 0) return 'Submitted today'
  const parts = []
  if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`)
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`)
  return parts.join(' ')
}

function QueueFact({ icon, label, value, progress }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      {createElement(icon, { className: 'h-4 w-4 text-brand-700' })}
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xs font-bold text-slate-700">{value}</p>
      {typeof progress === 'number' && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full rounded-full ${progress >= 100 ? 'bg-success' : 'bg-brand-navy'}`} style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}
    </div>
  )
}
