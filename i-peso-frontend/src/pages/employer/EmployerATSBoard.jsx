import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  MailCheck,
  Search,
  Send,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getEmployerApplications, updateEmployerApplicationStatus } from '@/services/employerApplicationService'

const columns = [
  { id: 'pending', title: 'Inbox', label: 'Pending review', icon: MailCheck },
  { id: 'reviewed', title: 'Reviewed', label: 'Profile opened', icon: CheckCircle2 },
  { id: 'shortlisted', title: 'Shortlisted', label: 'Good candidate', icon: Sparkles },
  { id: 'interview', title: 'Interview', label: 'Schedule sent', icon: CalendarDays },
  { id: 'hired', title: 'Hired', label: 'Placement captured', icon: UserCheck },
  { id: 'rejected', title: 'Rejected', label: 'Closed', icon: Archive },
]

const emptyForm = {
  status: '',
  employer_remarks: '',
  interview: {
    mode_of_interview: 'face_to_face',
    schedule: '',
    venue_or_link: '',
    instructions: '',
  },
  placement_start_date: '',
  placement_salary: '',
}

export default function EmployerATSBoard() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeApplication, setActiveApplication] = useState(null)
  const [statusForm, setStatusForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const loadApplications = async () => {
    setError('')
    try {
      const data = await getEmployerApplications({ per_page: 100 })
      setApplications(data.data ?? [])
    } catch (caught) {
      setError(caught.response?.data?.message || 'Unable to load applicants.')
    }
  }

  useEffect(() => {
    loadApplications().finally(() => setLoading(false))
  }, [])

  const filteredApplications = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase()
    if (!needle) return applications

    return applications.filter((application) => {
      const seeker = application.seeker ?? {}
      const job = application.job ?? {}
      return [
        seeker.name,
        seeker.email,
        job.job_title,
        job.location,
        ...(seeker.skills ?? []),
      ].join(' ').toLowerCase().includes(needle)
    })
  }, [applications, searchQuery])

  const groupedApplications = useMemo(() => {
    const groups = Object.fromEntries(columns.map((column) => [column.id, []]))
    for (const application of filteredApplications) {
      groups[application.status]?.push(application)
    }

    for (const column of columns) {
      groups[column.id].sort((left, right) => Number(right.match_percentage ?? 0) - Number(left.match_percentage ?? 0))
    }

    return groups
  }, [filteredApplications])

  const activeCount = applications.filter((application) => !['hired', 'rejected'].includes(application.status)).length
  const hiredCount = applications.filter((application) => application.status === 'hired').length

  const openStatusForm = (application, status) => {
    setActiveApplication(application)
    setStatusForm({
      ...emptyForm,
      status,
      employer_remarks: application.employer_remarks ?? '',
    })
  }

  const closeStatusForm = () => {
    setActiveApplication(null)
    setStatusForm(emptyForm)
    setSaving(false)
  }

  const submitStatus = async () => {
    if (!activeApplication) return

    setSaving(true)
    try {
      const payload = buildPayload(statusForm)
      const data = await updateEmployerApplicationStatus(activeApplication.apply_id, payload)
      setApplications((current) => current.map((application) => (
        application.apply_id === activeApplication.apply_id ? data.application : application
      )))
      toast.success('Application status updated.')
      closeStatusForm()
    } catch (caught) {
      const body = caught.response?.data
      const firstError = body?.errors ? Object.values(body.errors)[0]?.[0] : ''
      toast.error(firstError || body?.message || 'Unable to update application.')
      setSaving(false)
    }
  }

  return (
    <div className="portal-page space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="portal-eyebrow">Applicant Tracking System</p>
          <h1 className="portal-title mt-1">Employer ATS Board</h1>
          <p className="portal-subtitle">
            Review real job seeker applications, schedule interviews, capture placements, and sync hiring status with PESO.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MetricBadge label="Active Applicants" value={activeCount} tone="blue" />
          <MetricBadge label="Hired" value={hiredCount} tone="emerald" />
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
            placeholder="Search applicants by name, job, email, or skill"
          />
        </div>
      </section>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-600">
          Loading applicants...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {!loading && !applications.length && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <BriefcaseBusiness className="mx-auto h-9 w-9 text-slate-300" />
          <h2 className="mt-3 text-lg font-black text-slate-950">No applicants yet</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Applicants will appear here when job seekers apply to your active vacancies.
          </p>
        </div>
      )}

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-inner">
        <div className="flex min-h-[32rem] gap-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              applications={groupedApplications[column.id] ?? []}
              onMove={openStatusForm}
            />
          ))}
        </div>
      </section>

      {activeApplication && (
        <StatusModal
          application={activeApplication}
          form={statusForm}
          setForm={setStatusForm}
          saving={saving}
          onClose={closeStatusForm}
          onSubmit={submitStatus}
        />
      )}
    </div>
  )
}

function KanbanColumn({ column, applications, onMove }) {
  const Icon = column.icon

  return (
    <div className="flex w-[20rem] shrink-0 flex-col rounded-xl border border-slate-200 bg-white/80">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-blue-900">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-950">{column.title}</h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">{column.label}</p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{applications.length}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3">
        {applications.length ? applications.map((application) => (
          <ApplicantCard key={application.apply_id} application={application} onMove={onMove} />
        )) : (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <Icon className="h-7 w-7 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-500">No applicants in this stage.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ApplicantCard({ application, onMove }) {
  const seeker = application.seeker ?? {}
  const job = application.job ?? {}
  const availableStatuses = columns.filter((column) => column.id !== application.status)

  return (
    <article className={`rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm ${matchBorderClass(application.match_percentage)} border-l-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{seeker.name || 'Unnamed seeker'}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{job.job_title || 'Untitled vacancy'}</p>
        </div>
        <div className="rounded-xl bg-slate-950 px-2.5 py-1 text-xs font-black text-white">
          {Math.round(Number(application.match_percentage ?? 0))}%
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(seeker.skills ?? []).slice(0, 3).map((skill) => (
          <span key={`${application.apply_id}-${skill}`} className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">{skill}</span>
        ))}
        {(seeker.skills ?? []).length > 3 && (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">+{seeker.skills.length - 3}</span>
        )}
      </div>

      <dl className="mt-3 space-y-1.5 text-xs text-slate-600">
        <Detail label="Education" value={seeker.educ_attainment || 'Not listed'} />
        <Detail label="Applied" value={formatDate(application.applied_at)} />
        <Detail label="Address" value={seeker.address || 'Not listed'} />
      </dl>

      {application.interview && (
        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">
          Interview: {formatDateTime(application.interview.schedule)} / {application.interview.venue_or_link || 'Venue to follow'}
        </div>
      )}

      {application.placement && (
        <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
          Hired: starts {formatDate(application.placement.start_date)} at {formatCurrency(application.placement.salary)}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {availableStatuses.map((column) => (
          <button
            key={column.id}
            type="button"
            onClick={() => onMove(application, column.id)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-600 hover:border-blue-900 hover:text-blue-900"
          >
            {column.title}
          </button>
        ))}
      </div>
    </article>
  )
}

function StatusModal({ application, form, setForm, saving, onClose, onSubmit }) {
  const seeker = application.seeker ?? {}
  const selectedColumn = columns.find((column) => column.id === form.status)
  const requiresInterview = form.status === 'interview'
  const requiresPlacement = form.status === 'hired'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6">
      <section className="max-h-[92vh] w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">Update Application</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">{seeker.name || 'Applicant'}</h2>
            <p className="mt-1 text-sm text-slate-500">Move to {selectedColumn?.title ?? form.status}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="max-h-[calc(92vh-8rem)] space-y-4 overflow-y-auto px-5 py-5">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Employer remarks</span>
            <textarea
              value={form.employer_remarks}
              onChange={(event) => setForm((current) => ({ ...current, employer_remarks: event.target.value }))}
              rows={3}
              className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
              placeholder="Optional note for applicant, PESO, or HR record"
            />
          </label>

          {requiresInterview && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <h3 className="font-black text-blue-950">Interview schedule</h3>
              <div className="mt-4 grid gap-3">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Mode</span>
                  <select
                    value={form.interview.mode_of_interview}
                    onChange={(event) => setForm((current) => ({ ...current, interview: { ...current.interview, mode_of_interview: event.target.value } }))}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none"
                  >
                    <option value="face_to_face">Face to face</option>
                    <option value="online">Online</option>
                    <option value="phone">Phone</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Schedule</span>
                  <input
                    type="datetime-local"
                    value={form.interview.schedule}
                    onChange={(event) => setForm((current) => ({ ...current, interview: { ...current.interview, schedule: event.target.value } }))}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Venue or link</span>
                  <input
                    value={form.interview.venue_or_link}
                    onChange={(event) => setForm((current) => ({ ...current, interview: { ...current.interview, venue_or_link: event.target.value } }))}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none"
                    placeholder="PESO office, company address, or meeting link"
                  />
                </label>
              </div>
            </div>
          )}

          {requiresPlacement && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <h3 className="font-black text-emerald-950">Placement capture</h3>
              <div className="mt-4 grid gap-3">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Start date</span>
                  <input
                    type="date"
                    value={form.placement_start_date}
                    onChange={(event) => setForm((current) => ({ ...current, placement_start_date: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Starting salary</span>
                  <input
                    type="number"
                    min="1"
                    value={form.placement_salary}
                    onChange={(event) => setForm((current) => ({ ...current, placement_salary: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none"
                    placeholder="0"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-slate-500">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:pointer-events-none disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save status'}
          </button>
        </footer>
      </section>
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="font-black uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-semibold text-slate-700">{value}</dd>
    </div>
  )
}

function MetricBadge({ label, value, tone }) {
  const classes = tone === 'emerald'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : 'border-blue-200 bg-blue-50 text-blue-800'

  return (
    <div className={`rounded-xl border px-4 py-3 ${classes}`}>
      <p className="text-[11px] font-black uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  )
}

function buildPayload(form) {
  const payload = {
    status: form.status,
    employer_remarks: form.employer_remarks || null,
  }

  if (form.status === 'interview') {
    payload.interview = form.interview
  }

  if (form.status === 'hired') {
    payload.placement_start_date = form.placement_start_date
    payload.placement_salary = form.placement_salary
  }

  return payload
}

function matchBorderClass(score) {
  const value = Number(score ?? 0)
  if (value >= 90) return 'border-l-green-500'
  if (value >= 70) return 'border-l-blue-500'
  if (value >= 50) return 'border-l-amber-500'
  return 'border-l-red-500'
}

function formatDate(value) {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not set'

  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(value) {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not set'

  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}
