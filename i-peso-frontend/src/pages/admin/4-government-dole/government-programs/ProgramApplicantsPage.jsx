import { useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle2, FileText, Paperclip, Users, XCircle } from 'lucide-react'
import { Badge, Button, Card, EmptyState, ErrorState, LoadingSkeleton, StatCard } from '@/components/ui'
import { ConfirmModal, PageHeader, StatusBadge } from '@/pages/admin/_components'
import { adminService } from '@/services/adminService'

const STATUS_OPTIONS = [
  'pending',
  'under_review',
  'qualified',
  'for_interview',
  'approved',
  'rejected',
  'completed',
  'cancelled',
]

const PER_PAGE = 20

export default function ProgramApplicantsPage() {
  const { id: programId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState([])
  const [dialog, setDialog] = useState(null)

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'programApplicants', programId, status, appliedSearch, page],
    queryFn: () => adminService.getProgramApplicants(programId, {
      status,
      search: appliedSearch,
      page,
      per_page: PER_PAGE,
    }),
    placeholderData: keepPreviousData,
  })

  const program = data?.program ?? {}
  const paginator = data?.applications
  const applicants = useMemo(() => paginator?.data ?? [], [paginator])
  const statusCounts = data?.status_counts ?? {}

  const selectableIds = useMemo(
    () => applicants.filter(canReview).map((applicant) => applicant.application_id),
    [applicants],
  )
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.includes(id))

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'programApplicants', programId] })

  const reviewOne = useMutation({
    mutationFn: ({ applicationId, nextStatus, remarks }) =>
      adminService.updateProgramApplicationStatus(applicationId, nextStatus, remarks),
    onSuccess: (_result, variables) => {
      toast.success(`Application set to ${prettify(variables.nextStatus)}.`)
      setDialog(null)
      setSelected((current) => current.filter((id) => id !== variables.applicationId))
      invalidate()
    },
    onError: (caught) => toast.error(resolveError(caught, 'Unable to update this application.')),
  })

  const reviewBulk = useMutation({
    mutationFn: ({ ids, action, remarks }) => adminService.bulkReviewApplicants(programId, ids, action, remarks),
    onSuccess: (result) => {
      const failed = result?.failed ?? []
      if (failed.length) {
        toast.error(result.message ?? `${failed.length} application(s) could not be processed.`)
      } else {
        toast.success(result?.message ?? 'Applications reviewed.')
      }
      setDialog(null)
      setSelected([])
      invalidate()
    },
    onError: (caught) => toast.error(resolveError(caught, 'Bulk review failed.')),
  })

  const busy = reviewOne.isPending || reviewBulk.isPending

  const applyFilters = (nextStatus, nextSearch) => {
    setStatus(nextStatus)
    setAppliedSearch(nextSearch)
    setPage(1)
    setSelected([])
  }

  const toggleRow = (id) =>
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))

  const toggleAll = () => setSelected(allSelected ? [] : selectableIds)

  const openDocument = async (applicationId, document) => {
    try {
      const blob = await adminService.getProgramApplicationDocument(applicationId, document.document_id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener')
      // Give the new tab a moment to take ownership of the object URL.
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (caught) {
      toast.error(resolveError(caught, 'Unable to open this document.'))
    }
  }

  return (
    <div className="portal-page">
      <PageHeader
        title="Program Applicants"
        subtitle={program.title ?? 'Review and decide on applications for this program.'}
        eyebrow="Government & DOLE"
        actions={[{
          label: 'Back to programs',
          icon: ArrowLeft,
          variant: 'outline',
          onClick: () => navigate('/admin/government-programs'),
        }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          color="blue"
          label="Available slots"
          value={`${count(program.available_slots)} / ${count(program.total_slots)}`}
          subtitle={program.total_slots ? 'Remaining of total' : 'No slot limit set'}
          hint="Approving an application consumes a slot; reversing the decision returns it."
        />
        <StatCard icon={FileText} color="amber" label="Pending" value={count(statusCounts.pending)} />
        <StatCard icon={CheckCircle2} color="green" label="Approved" value={count(statusCounts.approved)} />
        <StatCard icon={XCircle} color="red" label="Rejected" value={count(statusCounts.rejected)} />
      </div>

      <Card padding="none" className="mt-6">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Applications</h2>
            <p className="text-sm text-slate-500">Approve, reject, or move applicants through the review stages.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-bold text-slate-600">Search</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && applyFilters(status, search)}
                placeholder="Name or email"
                className={inputClass}
              />
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-bold text-slate-600">Status</span>
              <select
                value={status}
                onChange={(event) => { setSearch(search); applyFilters(event.target.value, search) }}
                className={inputClass}
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {prettify(option)}{statusCounts[option] ? ` (${statusCounts[option]})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <Button size="sm" onClick={() => applyFilters(status, search)} disabled={isFetching}>Apply</Button>
          </div>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100 bg-brand-50/60 px-5 py-3 sm:px-6">
            <p className="text-sm font-bold text-slate-800">{selected.length} selected</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="success"
                icon={CheckCircle2}
                disabled={busy}
                onClick={() => setDialog({ kind: 'bulk', action: 'approve' })}
              >
                Approve selected
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon={XCircle}
                disabled={busy}
                onClick={() => setDialog({ kind: 'bulk', action: 'reject' })}
              >
                Reject selected
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected([])} disabled={busy}>Clear</Button>
            </div>
          </div>
        )}

        {isFetching && !data ? (
          <LoadingSkeleton variant="table" rows={8} columns={6} />
        ) : isError ? (
          <ErrorState description={resolveError(error, 'Unable to load applicants.')} onRetry={refetch} />
        ) : applicants.length === 0 ? (
          <EmptyState
            title={status || appliedSearch ? 'No applicants match your filters' : 'No applicants yet'}
            description={
              status || appliedSearch
                ? 'Try clearing the status filter or search term.'
                : 'Seekers who apply to this program will appear here.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <caption className="sr-only">Applicants for this government program.</caption>
              <thead>
                <tr className="border-b border-slate-200 bg-brand-navy text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300">
                  <th scope="col" className="px-5 py-3.5">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      disabled={selectableIds.length === 0}
                      aria-label="Select all reviewable applicants"
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-left">Applicant</th>
                  <th scope="col" className="px-5 py-3.5 text-left">Eligibility</th>
                  <th scope="col" className="px-5 py-3.5 text-left">Documents</th>
                  <th scope="col" className="px-5 py-3.5 text-left">Status</th>
                  <th scope="col" className="px-5 py-3.5 text-left">Applied</th>
                  <th scope="col" className="px-5 py-3.5 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((applicant) => (
                  <tr key={applicant.application_id} className="border-b border-slate-100 align-top last:border-0">
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selected.includes(applicant.application_id)}
                        onChange={() => toggleRow(applicant.application_id)}
                        disabled={!canReview(applicant)}
                        aria-label={`Select ${applicant.seeker?.name ?? 'applicant'}`}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <p className="font-semibold text-slate-900">{applicant.seeker?.name || 'Unnamed applicant'}</p>
                      <p className="text-xs text-slate-500">{applicant.seeker?.email}</p>
                      {applicant.seeker?.address && (
                        <p className="mt-1 text-xs text-slate-400">{applicant.seeker.address}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {applicant.eligibility_score !== null && applicant.eligibility_score !== undefined ? (
                        <Badge variant={applicant.eligibility_score >= 70 ? 'approved' : 'pending'}>
                          {Math.round(applicant.eligibility_score)}%
                        </Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {applicant.documents?.length ? (
                        <ul className="space-y-1">
                          {applicant.documents.map((document) => (
                            <li key={document.document_id}>
                              <button
                                type="button"
                                onClick={() => openDocument(applicant.application_id, document)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 underline-offset-2 hover:underline"
                              >
                                <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                {document.document_name || document.document_type}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-slate-400">None submitted</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <StatusBadge status={applicant.status} />
                      {applicant.remarks && (
                        <p className="mt-1.5 max-w-52 text-xs leading-5 text-slate-500">{applicant.remarks}</p>
                      )}
                      {applicant.reviewer && (
                        <p className="mt-1 text-xs text-slate-400">by {applicant.reviewer}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {formatDate(applicant.applied_at)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="success"
                            disabled={busy || applicant.status === 'approved'}
                            onClick={() => setDialog({ kind: 'single', applicant, nextStatus: 'approved' })}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={busy || applicant.status === 'rejected'}
                            onClick={() => setDialog({ kind: 'single', applicant, nextStatus: 'rejected' })}
                          >
                            Reject
                          </Button>
                        </div>
                        <select
                          value=""
                          disabled={busy}
                          onChange={(event) => event.target.value && setDialog({
                            kind: 'single',
                            applicant,
                            nextStatus: event.target.value,
                          })}
                          aria-label={`Move ${applicant.seeker?.name ?? 'applicant'} to another stage`}
                          className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-brand-500"
                        >
                          <option value="">Move to stage…</option>
                          {STATUS_OPTIONS.filter((option) => option !== applicant.status).map((option) => (
                            <option key={option} value={option}>{prettify(option)}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {paginator?.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 p-4">
            <p className="text-xs text-slate-500">
              Page {paginator.current_page} of {paginator.last_page} · {count(paginator.total)} applicants
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={isFetching || paginator.current_page <= 1} onClick={() => setPage((current) => current - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="outline" disabled={isFetching || paginator.current_page >= paginator.last_page} onClick={() => setPage((current) => current + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ConfirmModal
        isOpen={Boolean(dialog)}
        title={dialogTitle(dialog, selected.length)}
        message={dialogMessage(dialog, selected.length)}
        confirmText={dialog?.kind === 'bulk' ? `Yes, ${dialog.action}` : 'Confirm'}
        isDangerous={isRejection(dialog)}
        requiresReason
        reasonRequired={isRejection(dialog)}
        reasonLabel={isRejection(dialog) ? 'Reason (required — the applicant will see this)' : 'Remarks (optional)'}
        loading={busy}
        onCancel={() => setDialog(null)}
        onConfirm={(remarks) => {
          if (!dialog) return
          if (dialog.kind === 'bulk') {
            reviewBulk.mutate({ ids: selected, action: dialog.action, remarks })
          } else {
            reviewOne.mutate({
              applicationId: dialog.applicant.application_id,
              nextStatus: dialog.nextStatus,
              remarks,
            })
          }
        }}
      />
    </div>
  )
}

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 sm:min-w-44'

/** Terminal states are left alone — bulk actions would only churn slot accounting. */
function canReview(applicant) {
  return !['completed', 'cancelled'].includes(applicant.status)
}

function isRejection(dialog) {
  if (!dialog) return false
  return dialog.kind === 'bulk' ? dialog.action === 'reject' : dialog.nextStatus === 'rejected'
}

function dialogTitle(dialog, selectedCount) {
  if (!dialog) return ''
  return dialog.kind === 'bulk'
    ? `${prettify(dialog.action)} ${selectedCount} application(s)?`
    : `Set status to ${prettify(dialog.nextStatus)}?`
}

function dialogMessage(dialog, selectedCount) {
  if (!dialog) return ''

  if (dialog.kind === 'bulk') {
    return dialog.action === 'approve'
      ? `${selectedCount} applicant(s) will be approved and each will consume a program slot. Any that cannot be approved — for example once slots run out — are reported back individually.`
      : `${selectedCount} applicant(s) will be rejected and notified. Approved applicants among them release their slot.`
  }

  return `${dialog.applicant.seeker?.name ?? 'This applicant'} will be moved to ${prettify(dialog.nextStatus)} and notified of the change.`
}

function resolveError(caught, fallback) {
  return caught?.response?.data?.message ?? fallback
}

function count(value) {
  return Number(value || 0).toLocaleString()
}

function prettify(value = '') {
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-PH') : '—'
}
