import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Building2, ChevronRight, FileText, Lock, Paperclip, ShieldCheck, UserRound, X } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { safetyReportService, safetyStatusBadge } from '@/services/safetyReportService'

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : '—')
const formatDateTime = (value) => (value ? new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—')

/**
 * The reports a job seeker or employer has filed, and their status. Shows
 * only the reporter-safe view: never PESO's notes, findings or actions.
 */
export default function MySafetyReportsPage({ role }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const openId = searchParams.get('case')
  const [page, setPage] = useState(1)

  const listQuery = useQuery({
    queryKey: ['mySafetyReports', role, page],
    queryFn: () => safetyReportService.list(role, { page }),
    placeholderData: (previous) => previous,
  })
  const reports = listQuery.data?.data ?? []
  const lastPage = listQuery.data?.last_page ?? 1

  const openCase = (id) => setSearchParams(id ? { case: String(id) } : {})
  const reportingEmployers = role === 'seeker'

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wider text-blue-700">Report &amp; Safety</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">My safety reports</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Concerns you reported to PESO about {reportingEmployers ? 'employers, companies or job vacancies' : 'applicants'}.
          Reports are confidential — {reportingEmployers ? 'the employer' : 'the applicant'} is never told who filed them.
        </p>
      </header>

      <div className="mt-4 flex gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {reportingEmployers
            ? 'To report a concern, use “Report” on a company profile, a job vacancy or one of your applications.'
            : 'To report a concern, open the applicant from Applicants and use “Report to PESO”.'}
          {' '}A PESO administrator reviews every report before any action is taken.
        </span>
      </div>

      <section className="mt-6">
        {listQuery.isLoading ? (
          <LoadingSkeleton variant="card" rows={3} />
        ) : listQuery.isError ? (
          <ErrorState title="Your reports could not be loaded" description="Check your connection and try again." onRetry={() => listQuery.refetch()} />
        ) : reports.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No reports filed" description="You haven't reported any concerns. We hope it stays that way." />
        ) : (
          <ul className="space-y-3">
            {reports.map((report) => (
              <li key={report.id}>
                <button
                  type="button"
                  onClick={() => openCase(report.id)}
                  className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    {report.subject_type === 'employer' ? <Building2 className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-slate-950">{report.subject_name}</span>
                      <span className="font-mono text-xs text-slate-400">{report.case_number}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-slate-600">
                      {report.category_label}{report.vacancy_title ? ` · ${report.vacancy_title}` : ''}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-400">Filed {formatDate(report.created_at)}</span>
                  </span>
                  <Badge status={safetyStatusBadge(report.status)}>{report.status_label}</Badge>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {lastPage > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
            <span className="text-xs font-bold text-slate-600">Page {page} of {lastPage}</span>
            <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => setPage((current) => current + 1)}>Next</Button>
          </div>
        )}
      </section>

      {openId && <ReportDetailDialog role={role} id={openId} onClose={() => openCase(null)} />}
    </div>
  )
}

function ReportDetailDialog({ role, id, onClose }) {
  const queryClient = useQueryClient()
  const fileInput = useRef(null)
  const [details, setDetails] = useState('')
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['mySafetyReport', role, id],
    queryFn: () => safetyReportService.get(role, id),
  })

  const addDetails = useMutation({
    mutationFn: () => safetyReportService.addDetails(role, id, { details: details.trim() || null, attachments: files }),
    onSuccess: (data) => {
      queryClient.setQueryData(['mySafetyReport', role, id], data.report)
      queryClient.invalidateQueries({ queryKey: ['mySafetyReports', role] })
      setDetails('')
      setFiles([])
      setError('')
      toast.success(data.message)
    },
    onError: (caught) => {
      const errors = caught?.response?.data?.errors ?? {}
      setError(Object.values(errors)[0]?.[0] ?? caught?.response?.data?.message ?? 'Your information could not be added.')
    },
  })

  const submitDetails = (event) => {
    event.preventDefault()
    if (details.trim().length > 0 && details.trim().length < 10) {
      setError('Add a little more detail (at least 10 characters).')
      return
    }
    if (!details.trim() && files.length === 0) {
      setError('Write the new information or attach a file.')
      return
    }
    addDetails.mutate()
  }

  const slotsLeft = Math.max(0, 5 - (report?.attachments?.length ?? 0) - files.length)

  return (
    <Dialog open onOpenChange={(open) => !open && !addDetails.isPending && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        {isLoading ? (
          <LoadingSkeleton variant="card" rows={3} />
        ) : isError || !report ? (
          <>
            <DialogHeader><DialogTitle>Report not found</DialogTitle></DialogHeader>
            <p className="text-sm text-slate-600">This report could not be opened. It may belong to a different account.</p>
            <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                Report about {report.subject_name}
                <Badge status={safetyStatusBadge(report.status)}>{report.status_label}</Badge>
              </DialogTitle>
              <DialogDescription>
                Case <span className="font-mono font-semibold text-slate-700">{report.case_number}</span> · filed {formatDateTime(report.created_at)}
              </DialogDescription>
            </DialogHeader>

            <p className={`rounded-lg border px-3 py-2 text-sm ${report.is_open ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
              {report.outcome_message}
            </p>

            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Reason</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{report.category_label}</dd>
              </div>
              {report.vacancy_title && (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Job vacancy</dt>
                  <dd className="mt-0.5 text-slate-700">{report.vacancy_title}</dd>
                </div>
              )}
              {report.incident_date && (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Date of incident</dt>
                  <dd className="mt-0.5 text-slate-700">{formatDate(report.incident_date)}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">What you reported</dt>
                <dd className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 leading-6 text-slate-700">{report.description}</dd>
              </div>
              {report.attachments?.length > 0 && (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Evidence sent</dt>
                  <dd className="mt-1 space-y-1">
                    {report.attachments.map((file) => (
                      <p key={file.id} className="flex items-center gap-2 text-slate-700"><FileText className="h-4 w-4 text-slate-400" />{file.name}</p>
                    ))}
                  </dd>
                </div>
              )}
              {report.updates?.length > 0 && (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Information you added</dt>
                  <dd className="mt-1 space-y-2">
                    {report.updates.map((update, index) => (
                      <div key={index} className="rounded-lg border border-slate-200 p-3">
                        <p className="text-xs text-slate-400">{formatDateTime(update.created_at)}{update.attachments ? ` · ${update.attachments} file(s)` : ''}</p>
                        {update.body && <p className="mt-1 whitespace-pre-wrap text-slate-700">{update.body}</p>}
                      </div>
                    ))}
                  </dd>
                </div>
              )}
            </dl>

            {report.is_open && (
              <form onSubmit={submitDetails} className="space-y-3 border-t border-slate-200 pt-4">
                <p className="text-sm font-bold text-slate-800">Add new information</p>
                <textarea
                  rows={3}
                  maxLength={3000}
                  value={details}
                  onChange={(event) => { setDetails(event.target.value); setError('') }}
                  placeholder="Something new happened, or you remembered a detail? Add it here."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
                />
                {files.length > 0 && (
                  <ul className="space-y-1">
                    {files.map((file, index) => (
                      <li key={`${file.name}-${index}`} className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-slate-400" /><span className="flex-1 truncate">{file.name}</span>
                        <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, i) => i !== index))} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-3.5 w-3.5" /></button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {slotsLeft > 0 ? (
                    <>
                      <input
                        ref={fileInput}
                        id="report-more-evidence"
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        className="sr-only"
                        onChange={(event) => {
                          const picked = Array.from(event.target.files ?? []).filter((file) => file.size <= 5 * 1024 * 1024).slice(0, slotsLeft)
                          setFiles((current) => [...current, ...picked])
                          if (fileInput.current) fileInput.current.value = ''
                        }}
                      />
                      <label htmlFor="report-more-evidence" className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-blue-700 hover:underline">
                        <Paperclip className="h-4 w-4" />Attach evidence
                      </label>
                    </>
                  ) : <span className="text-xs text-slate-500">This case has the maximum number of files.</span>}
                  <Button type="submit" size="sm" variant="navy" loading={addDetails.isPending}>Add to case</Button>
                </div>
                <p className="flex gap-1.5 text-xs text-slate-500"><Lock className="mt-0.5 h-3 w-3 shrink-0" />Only PESO administrators can see what you add.</p>
                {error && <p className="text-xs font-medium text-red-600">{error}</p>}
              </form>
            )}

            <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
