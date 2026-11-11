import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft, BriefcaseBusiness, Building2, ClipboardList, Eye, FileText, Flag, Gavel, History,
  Lock, MessageSquareText, ShieldAlert, ShieldCheck, UserRound,
} from 'lucide-react'
import { Badge, Button, Card, ConfirmDialog, LoadingSkeleton } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import { adminSafetyReportService, safetyPriorityClass, safetyStatusBadge } from '@/services/safetyReportService'

const formatDateTime = (value) => (value ? new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—')
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : '—')
const titleCase = (value = '') => value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
const fieldClass = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-normal focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/15'
const labelClass = 'block text-xs font-extrabold uppercase tracking-wide text-slate-500'
const errorText = (error, fallback) => Object.values(error?.response?.data?.errors ?? {}).flat()[0] ?? error?.response?.data?.message ?? fallback

export default function SafetyReportDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const key = ['admin', 'safetyReport', id]

  const { data: report, isLoading, isError, error } = useQuery({ queryKey: key, queryFn: () => adminSafetyReportService.get(id), enabled: Boolean(id) })
  const { data: options } = useQuery({ queryKey: ['admin', 'safetyReportOptions'], queryFn: adminSafetyReportService.options, staleTime: 10 * 60_000 })

  const applyUpdate = (data) => {
    queryClient.setQueryData(key, data.report)
    queryClient.invalidateQueries({ queryKey: ['admin', 'safetyReports'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'safetyReportSummary'] })
    toast.success(data.message)
  }

  if (isLoading) return <div className="portal-page space-y-6"><LoadingSkeleton variant="text" rows={1} className="max-w-xs" /><LoadingSkeleton variant="card" rows={4} /></div>
  if (isError || !report) {
    return (
      <div className="portal-page">
        <PageHeader title="Safety report" eyebrow="Constituent CRM · Reports & Safety" />
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error?.response?.data?.message ?? 'This report could not be loaded.'}</div>
        <Button variant="outline" icon={ArrowLeft} className="mt-4" onClick={() => navigate('/admin/safety-reports')}>Back to reports</Button>
      </div>
    )
  }

  const subjectPath = report.subject.exists && report.subject.id
    ? (report.subject_type === 'employer' ? `/admin/employers/${report.subject.id}` : `/admin/job-seekers/${report.subject.id}`)
    : null
  const reporterPath = report.reporter.id
    ? (report.reporter.type === 'employer' ? `/admin/employers/${report.reporter.id}` : report.reporter.type === 'job_seeker' ? `/admin/job-seekers/${report.reporter.id}` : null)
    : null

  return (
    <div className="portal-page">
      <button type="button" onClick={() => navigate('/admin/safety-reports')} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />Back to Reports &amp; Safety
      </button>

      <PageHeader
        title={`Case ${report.case_number}`}
        subtitle={`${report.category_label} · filed ${formatDateTime(report.created_at)} by a ${report.reporter.type_label.toLowerCase()}`}
        eyebrow="Constituent CRM · Reports & Safety"
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge status={safetyStatusBadge(report.status)}>{report.status_label}</Badge>
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${safetyPriorityClass(report.priority)}`}>{report.priority_label} priority</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
          {report.subject_type === 'employer' ? <Building2 className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
          Report about a{report.subject_type === 'employer' ? 'n employer' : ' job seeker'}
        </span>
        {report.assigned_to && <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">Assigned to {report.assigned_to}</span>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-6">
          <Card>
            <h2 className="flex items-center gap-2 font-black text-slate-950"><Flag className="h-5 w-5 text-red-600" />What was reported</h2>
            <p className="mt-1 text-xs text-slate-500">An allegation to be reviewed — not proof of wrongdoing.</p>
            <dl className="mt-4 space-y-3 text-sm">
              <Field label="Category">{report.category_label}</Field>
              {report.incident_date && <Field label="Date of incident">{formatDate(report.incident_date)}</Field>}
              <Field label="Description"><span className="block whitespace-pre-wrap rounded-lg bg-slate-50 p-4 leading-6 text-slate-700">{report.description}</span></Field>
              {report.review_id && <Field label="Source">Opened by PESO from employer review #{report.review_id} · <Link to="/admin/reviews" className="font-semibold text-blue-700 hover:underline">Reviews &amp; Feedback</Link></Field>}
            </dl>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <h3 className="flex items-center gap-2 font-black text-slate-950">
                {report.subject_type === 'employer' ? <Building2 className="h-4 w-4 text-slate-500" /> : <UserRound className="h-4 w-4 text-slate-500" />}
                Reported party
              </h3>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Name">{report.subject.name}</Row>
                <Row label="Email">{report.subject.email}</Row>
                {report.subject.verification_status && <Row label="Verification">{titleCase(report.subject.verification_status)}</Row>}
                <Row label="Reports about them">{report.subject.reports_about} total · {report.subject.open_reports_about} open</Row>
              </dl>
              {report.subject.restriction && (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  <strong>{report.subject.restriction.label}</strong>
                  {report.subject.restriction.ends_at ? ` until ${formatDate(report.subject.restriction.ends_at)}` : ' until lifted'}
                  {report.subject.restriction.reason ? ` — ${report.subject.restriction.reason}` : ''}
                </p>
              )}
              {!report.subject.exists && <p className="mt-3 rounded-lg bg-slate-100 p-3 text-xs text-slate-600">This account no longer exists. The case is kept for the record.</p>}
              {subjectPath && <Button variant="outline" size="sm" className="mt-4" to={subjectPath}>Open profile</Button>}
              {report.subject.other_cases?.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Other cases about them</p>
                  <ul className="mt-2 space-y-1.5">
                    {report.subject.other_cases.map((other) => (
                      <li key={other.id} className="flex items-center justify-between gap-2 text-xs">
                        <Link to={`/admin/safety-reports/${other.id}`} className="font-mono font-semibold text-blue-700 hover:underline">{other.case_number}</Link>
                        <span className="truncate text-slate-500">{other.category_label}</span>
                        <Badge status={safetyStatusBadge(other.status)} icon={false}>{other.status_label}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            <Card>
              <h3 className="flex items-center gap-2 font-black text-slate-950"><ShieldCheck className="h-4 w-4 text-slate-500" />Reported by</h3>
              <p className="mt-1 text-xs text-slate-500">Confidential. Never shown to the reported party.</p>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Type">{report.reporter.type_label}</Row>
                <Row label="Name">{report.reporter.name}</Row>
                {report.reporter.contact_hidden ? (
                  <p className="flex items-center gap-1.5 rounded-lg bg-slate-50 p-2 text-xs text-slate-500"><Lock className="h-3.5 w-3.5" />Contact details are visible to staff with full access.</p>
                ) : (
                  <>
                    <Row label="Email">{report.reporter.email}</Row>
                    <Row label="Mobile">{report.reporter.mobile_number}</Row>
                  </>
                )}
                {report.reporter.history && (
                  <Row label="Reports filed">
                    {report.reporter.history.filed} total
                    {report.reporter.history.dismissed_false > 0 && <span className="ml-1 font-bold text-red-700">· {report.reporter.history.dismissed_false} found false</span>}
                  </Row>
                )}
              </dl>
              {reporterPath && <Button variant="outline" size="sm" className="mt-4" to={reporterPath}>Open profile</Button>}
            </Card>
          </div>

          {(report.vacancy || report.application) && (
            <div className="grid gap-4 md:grid-cols-2">
              {report.vacancy && (
                <Card>
                  <h3 className="flex items-center gap-2 font-black text-slate-950"><BriefcaseBusiness className="h-4 w-4 text-slate-500" />Job vacancy</h3>
                  <dl className="mt-3 space-y-2 text-sm">
                    <Row label="Title">{report.vacancy.job_title}</Row>
                    <Row label="Status">{titleCase(report.vacancy.status)}{report.vacancy.on_hold ? ' · on hold by PESO' : ''}</Row>
                    {report.vacancy.location && <Row label="Location">{report.vacancy.location}</Row>}
                    <Row label="Posted">{formatDate(report.vacancy.created_at)}</Row>
                  </dl>
                  <Button variant="outline" size="sm" className="mt-4" to={`/admin/job-postings/${report.vacancy.post_id}`}>Open job posting</Button>
                </Card>
              )}
              {report.application && (
                <Card>
                  <h3 className="flex items-center gap-2 font-black text-slate-950"><ClipboardList className="h-4 w-4 text-slate-500" />Application</h3>
                  <dl className="mt-3 space-y-2 text-sm">
                    <Row label="For">{report.application.job_title}</Row>
                    <Row label="Status">{titleCase(report.application.status)}</Row>
                    <Row label="Applied">{formatDate(report.application.applied_at)}</Row>
                    <Row label="Last change">{formatDateTime(report.application.status_changed_at)}</Row>
                  </dl>
                </Card>
              )}
            </div>
          )}

          <Card>
            <h3 className="flex items-center gap-2 font-black text-slate-950"><FileText className="h-4 w-4 text-slate-500" />Evidence</h3>
            {report.attachments.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No files were attached.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {report.attachments.map((file) => (
                  <li key={file.id} className="flex items-center gap-3 py-2 text-sm">
                    <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{file.name}</span>
                    <span className="hidden text-xs text-slate-400 sm:inline">{formatDateTime(file.created_at)}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Eye}
                      onClick={() => adminSafetyReportService.openAttachment(report.id, file.id).catch(() => toast.error('The file could not be opened.'))}
                    >
                      Open
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><Lock className="h-3.5 w-3.5" />Opening evidence is recorded in the activity log.</p>
          </Card>

          <Card>
            <h3 className="flex items-center gap-2 font-black text-slate-950"><History className="h-4 w-4 text-slate-500" />Case history</h3>
            <p className="mt-1 text-xs text-slate-500">Internal — visible to authorized PESO personnel only.</p>
            <ol className="mt-4 space-y-4">
              {report.timeline.map((entry) => (
                <li key={entry.id} className="flex gap-3">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${entry.kind === 'action' ? 'bg-red-500' : entry.kind === 'note' ? 'bg-amber-500' : entry.kind === 'reporter_update' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">{entry.title}</p>
                    <p className="text-xs text-slate-500">{entry.actor} · {formatDateTime(entry.created_at)}</p>
                    {entry.body && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{entry.body}</p>}
                    {entry.notice && <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600"><span className="font-bold">Notice sent:</span> {entry.notice}</p>}
                    {entry.meta?.ends_at && <p className="mt-1 text-xs text-slate-500">Until {formatDate(entry.meta.ends_at)}</p>}
                    {entry.meta?.vacancy_title && <p className="mt-1 text-xs text-slate-500">Vacancy: {entry.meta.vacancy_title}</p>}
                    {entry.meta?.vacancies_held > 0 && <p className="mt-1 text-xs text-slate-500">{entry.meta.vacancies_held} open vacancies put on hold</p>}
                    {entry.meta?.vacancies_released > 0 && <p className="mt-1 text-xs text-slate-500">{entry.meta.vacancies_released} vacancies released</p>}
                    {entry.meta?.attachments > 0 && <p className="mt-1 text-xs text-slate-500">{entry.meta.attachments} file(s) attached</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          {report.can_manage ? (
            <>
              <ReviewCard report={report} options={options} onSaved={applyUpdate} />
              <ActionCard report={report} onSaved={applyUpdate} />
              <NoteCard report={report} onSaved={applyUpdate} />
            </>
          ) : (
            <Card>
              <p className="flex items-center gap-2 text-sm font-bold text-slate-800"><Lock className="h-4 w-4" />View-only access</p>
              <p className="mt-1 text-sm text-slate-500">Reviewing, recording actions and adding notes need full Constituent CRM access.</p>
            </Card>
          )}
          {report.closed_at && (
            <Card>
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Closing record</p>
              <p className="mt-2 text-sm text-slate-700">
                {report.status_label} by <strong>{report.closed_by ?? 'PESO'}</strong> on {formatDateTime(report.closed_at)}
                {report.dismissal_reason_label ? ` · ${report.dismissal_reason_label}` : ''}
              </p>
              {report.resolution_summary && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{report.resolution_summary}</p>}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function ReviewCard({ report, options, onSaved }) {
  const [status, setStatus] = useState(report.status)
  const [priority, setPriority] = useState(report.priority)
  const [assignee, setAssignee] = useState(report.assigned_admin_id ? String(report.assigned_admin_id) : '')
  const [summary, setSummary] = useState('')
  const [dismissalReason, setDismissalReason] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [synced, setSynced] = useState(report.updated_at)

  // Re-seed when the case changes underneath (another save on this page).
  if (synced !== report.updated_at) {
    setSynced(report.updated_at)
    setStatus(report.status)
    setPriority(report.priority)
    setAssignee(report.assigned_admin_id ? String(report.assigned_admin_id) : '')
    setSummary('')
    setDismissalReason('')
    setNote('')
  }

  const closing = (status === 'resolved' || status === 'dismissed') && status !== report.status
  const reopening = !['resolved', 'dismissed'].includes(status) && ['resolved', 'dismissed'].includes(report.status)
  const dirty = status !== report.status || priority !== report.priority || assignee !== (report.assigned_admin_id ? String(report.assigned_admin_id) : '')

  const save = useMutation({
    mutationFn: () => adminSafetyReportService.update(report.id, {
      status: status !== report.status ? status : undefined,
      priority: priority !== report.priority ? priority : undefined,
      ...(assignee !== (report.assigned_admin_id ? String(report.assigned_admin_id) : '')
        ? (assignee ? { assigned_admin_id: Number(assignee) } : { unassign: true })
        : {}),
      resolution_summary: closing ? summary : undefined,
      dismissal_reason: status === 'dismissed' && closing ? dismissalReason : undefined,
      note: note || undefined,
    }),
    onSuccess: (data) => { setError(''); onSaved(data) },
    onError: (caught) => setError(errorText(caught, 'The case could not be updated.')),
  })

  return (
    <Card>
      <h2 className="flex items-center gap-2 font-black text-slate-950"><ShieldAlert className="h-5 w-5 text-brand-navy" />Review</h2>
      <div className="mt-4 space-y-4">
        <label className="block">
          <span className={labelClass}>Status</span>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setError('') }} className={fieldClass}>
            {(options?.statuses ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>

        {closing && status === 'dismissed' && (
          <label className="block">
            <span className={labelClass}>Why dismiss?</span>
            <select value={dismissalReason} onChange={(event) => setDismissalReason(event.target.value)} className={fieldClass}>
              <option value="">Choose a reason…</option>
              {(options?.dismissal_reasons ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        )}
        {closing && (
          <label className="block">
            <span className={labelClass}>{status === 'resolved' ? 'Resolution — findings and action taken' : 'Reason for dismissing'}</span>
            <textarea rows={4} maxLength={5000} value={summary} onChange={(event) => setSummary(event.target.value)} className={fieldClass}
              placeholder="Internal record of what was found and why the case is closed. The reporter only sees that it was resolved or closed." />
          </label>
        )}
        {(reopening || (!closing && status !== report.status)) && (
          <label className="block">
            <span className={labelClass}>{reopening ? 'Why reopen this case?' : 'Note (optional)'}</span>
            <textarea rows={2} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} className={fieldClass} />
          </label>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Priority</span>
            <select value={priority} onChange={(event) => setPriority(event.target.value)} className={fieldClass}>
              {(options?.priorities ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Assigned to</span>
            <select value={assignee} onChange={(event) => setAssignee(event.target.value)} className={fieldClass}>
              <option value="">Unassigned</option>
              {(options?.assignees ?? []).map((option) => <option key={option.value} value={String(option.value)}>{option.label}</option>)}
            </select>
          </label>
        </div>

        {(status === 'resolved' || status === 'dismissed') && closing && (
          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">The reporter will be notified that the case was {status}. They won't see your notes or the action taken.</p>
        )}
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        <Button variant="primary" className="w-full" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>Save review</Button>
      </div>
    </Card>
  )
}

function ActionCard({ report, onSaved }) {
  const [action, setAction] = useState('')
  const [reason, setReason] = useState('')
  const [notice, setNotice] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [postId, setPostId] = useState(report.vacancy?.post_id ? String(report.vacancy.post_id) : '')
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  const selected = report.available_actions.find((item) => item.value === action)
  const vacancies = report.subject.vacancies ?? []
  const vacancyChoices = action === 'restore_vacancy' ? vacancies.filter((item) => item.on_hold) : vacancies.filter((item) => !item.on_hold)
  const restriction = report.subject.restriction

  const record = useMutation({
    mutationFn: () => adminSafetyReportService.recordAction(report.id, {
      action,
      reason,
      notice: selected?.notifies ? notice : undefined,
      ends_at: selected?.needs_end_date ? endsAt : undefined,
      post_id: selected?.needs_vacancy ? Number(postId) || undefined : undefined,
    }),
    onSuccess: (data) => {
      setConfirming(false)
      setAction('')
      setReason('')
      setNotice('')
      setEndsAt('')
      setError('')
      onSaved(data)
    },
    onError: (caught) => { setConfirming(false); setError(errorText(caught, 'The action could not be recorded.')) },
  })

  const submit = () => {
    if (!action) return setError('Choose an action.')
    if (reason.trim().length < 10) return setError('Record the justification for this action (at least 10 characters).')
    if (selected?.notifies && notice.trim().length < 10) return setError('Write the notice the reported party will receive.')
    if (selected?.needs_vacancy && !postId) return setError('Choose the vacancy.')
    setError('')
    return selected?.severe ? setConfirming(true) : record.mutate()
  }

  // Earliest end date for a restriction: tomorrow.
  const [minDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10))

  return (
    <Card>
      <h2 className="flex items-center gap-2 font-black text-slate-950"><Gavel className="h-5 w-5 text-brand-navy" />Record an action</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">Nothing happens to the reported party until you record it here. Choose the least severe action that addresses the findings.</p>
      {restriction && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          Currently <strong>{restriction.label.toLowerCase()}</strong>{restriction.ends_at ? ` until ${formatDate(restriction.ends_at)}` : ' until lifted'}.
        </p>
      )}
      <div className="mt-4 space-y-4">
        <label className="block">
          <span className={labelClass}>Action</span>
          <select value={action} onChange={(event) => { setAction(event.target.value); setError('') }} className={fieldClass}>
            <option value="">Choose…</option>
            {report.available_actions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>

        {selected?.needs_vacancy && (
          <label className="block">
            <span className={labelClass}>Vacancy</span>
            <select value={postId} onChange={(event) => setPostId(event.target.value)} className={fieldClass}>
              <option value="">Choose a vacancy…</option>
              {vacancyChoices.map((item) => <option key={item.post_id} value={String(item.post_id)}>{item.job_title} ({titleCase(item.status)})</option>)}
            </select>
            {vacancyChoices.length === 0 && <span className="mt-1 block text-xs text-slate-500">{action === 'restore_vacancy' ? 'No vacancies of this employer are on hold.' : 'This employer has no vacancies to hide.'}</span>}
          </label>
        )}

        {selected?.needs_end_date && (
          <label className="block">
            <span className={labelClass}>Until</span>
            <input type="date" min={minDate} value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className={fieldClass} />
            <span className="mt-1 block text-xs text-slate-500">Leave empty to keep it in place until you lift it.</span>
          </label>
        )}

        {action && (
          <label className="block">
            <span className={labelClass}>Justification (internal)</span>
            <textarea rows={3} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} className={fieldClass}
              placeholder="The findings that justify this action. Kept in the case history." />
          </label>
        )}

        {selected?.notifies && (
          <label className="block">
            <span className={labelClass}>Notice to {report.subject_type === 'employer' ? 'the employer' : 'the job seeker'}</span>
            <textarea rows={3} maxLength={2000} value={notice} onChange={(event) => setNotice(event.target.value)} className={fieldClass}
              placeholder="What they will read in their notification and email. State the concern and what they need to do." />
            <span className="mt-1 flex gap-1.5 text-xs text-amber-800"><Lock className="mt-0.5 h-3 w-3 shrink-0" />Do not name or describe the reporter, or quote their evidence.</span>
          </label>
        )}

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        <Button variant={selected?.severe ? 'danger' : 'navy'} className="w-full" disabled={!action} loading={record.isPending && !confirming} onClick={submit}>
          Record action
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => !open && !record.isPending && setConfirming(false)}
        title={`${selected?.label ?? 'Confirm action'}?`}
        description={
          action === 'suspend_account'
            ? `${report.subject.name} will be signed out everywhere and unable to sign in${endsAt ? ` until ${formatDate(endsAt)}` : ' until you lift it'}.${report.subject_type === 'employer' ? ' Their open vacancies will be hidden from job seekers.' : ''} They will be emailed your notice.`
            : action === 'restrict_account'
              ? `${report.subject.name} will be unable to ${report.subject_type === 'employer' ? 'publish or reopen vacancies' : 'submit new applications'}${endsAt ? ` until ${formatDate(endsAt)}` : ' until you lift it'}. They will be notified.`
              : 'The vacancy will be hidden from job seekers and the employer will be notified.'
        }
        confirmLabel="Yes, record it"
        busy={record.isPending}
        onConfirm={() => record.mutate()}
      />
    </Card>
  )
}

function NoteCard({ report, onSaved }) {
  const [note, setNote] = useState('')
  const add = useMutation({
    mutationFn: () => adminSafetyReportService.addNote(report.id, note.trim()),
    onSuccess: (data) => { setNote(''); onSaved(data) },
    onError: (caught) => toast.error(errorText(caught, 'The note could not be added.')),
  })

  return (
    <Card>
      <h2 className="flex items-center gap-2 font-black text-slate-950"><MessageSquareText className="h-5 w-5 text-brand-navy" />Internal note</h2>
      <textarea rows={3} maxLength={5000} value={note} onChange={(event) => setNote(event.target.value)} className={fieldClass}
        placeholder="Calls made, documents checked, what each party said… Visible to PESO only." />
      <Button variant="outline" className="mt-3 w-full" disabled={note.trim().length < 3} loading={add.isPending} onClick={() => add.mutate()}>Add note</Button>
    </Card>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-slate-800">{children}</dd>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-slate-400">{label}</dt>
      <dd className="min-w-0 break-words text-right font-semibold text-slate-700">{children || '—'}</dd>
    </div>
  )
}

