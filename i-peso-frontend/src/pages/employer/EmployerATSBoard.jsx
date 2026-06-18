import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Filter,
  MailCheck,
  MapPin,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react'

const applicantSeed = [
  {
    id: 'app-1001',
    name: 'Maria Santos',
    matchScore: 96,
    skills: ['Bookkeeping', 'Payroll', 'Excel', 'Customer Service'],
    education: 'College Graduate - BS Accountancy',
    distance: '1.8 km',
    age: 27,
    gender: 'Female',
    meetsBfoq: true,
    appliedDate: '2026-06-17',
    status: 'inbox',
    address: 'San Vicente West, Urdaneta City, Pangasinan',
  },
  {
    id: 'app-1002',
    name: 'John Paul Ramos',
    matchScore: 91,
    skills: ['Laravel', 'MySQL', 'API Integration', 'Git'],
    education: 'College Graduate - BS Information Technology',
    distance: '4.2 km',
    age: 24,
    gender: 'Male',
    meetsBfoq: true,
    appliedDate: '2026-06-16',
    status: 'inbox',
    address: 'Nancayasan, Urdaneta City, Pangasinan',
  },
  {
    id: 'app-1003',
    name: 'Angelica Dela Cruz',
    matchScore: 88,
    skills: ['Front Desk', 'Scheduling', 'Records Management'],
    education: 'College Undergraduate',
    distance: '2.6 km',
    age: 21,
    gender: 'Female',
    meetsBfoq: false,
    appliedDate: '2026-06-15',
    status: 'shortlisted',
    address: 'Poblacion, Urdaneta City, Pangasinan',
  },
  {
    id: 'app-1004',
    name: 'Mark Anthony Garcia',
    matchScore: 82,
    skills: ['Driving', 'Route Planning', 'Vehicle Maintenance'],
    education: 'High School Graduate',
    distance: '5.7 km',
    age: 34,
    gender: 'Male',
    meetsBfoq: true,
    appliedDate: '2026-06-13',
    status: 'interviewing',
    address: 'Mabanogbog, Urdaneta City, Pangasinan',
  },
  {
    id: 'app-1005',
    name: 'Christine Mae Fernandez',
    matchScore: 78,
    skills: ['Data Entry', 'MS Office', 'Email Support'],
    education: 'TESDA - Computer Systems Servicing NC II',
    distance: '3.1 km',
    age: 30,
    gender: 'Female',
    meetsBfoq: true,
    appliedDate: '2026-06-12',
    status: 'inbox',
    address: 'Catablan, Urdaneta City, Pangasinan',
  },
  {
    id: 'app-1006',
    name: 'Rafael Aquino',
    matchScore: 73,
    skills: ['Welding', 'Blueprint Reading', 'Safety Compliance'],
    education: 'TESDA - SMAW NC II',
    distance: '8.5 km',
    age: 41,
    gender: 'Male',
    meetsBfoq: false,
    appliedDate: '2026-06-10',
    status: 'archived',
    address: 'Anonas, Urdaneta City, Pangasinan',
  },
  {
    id: 'app-1007',
    name: 'Patricia Ann Rivera',
    matchScore: 69,
    skills: ['Sales', 'Cashiering', 'Inventory'],
    education: 'Senior High School Graduate',
    distance: '6.4 km',
    age: 19,
    gender: 'Female',
    meetsBfoq: true,
    appliedDate: '2026-06-09',
    status: 'inbox',
    address: 'Manaoag Road, Urdaneta City, Pangasinan',
  },
  {
    id: 'app-1008',
    name: 'Noel Villanueva',
    matchScore: 94,
    skills: ['Machine Operation', 'Quality Control', 'Preventive Maintenance'],
    education: 'TESDA - Mechatronics Servicing NC II',
    distance: '7.9 km',
    age: 29,
    gender: 'Male',
    meetsBfoq: true,
    appliedDate: '2026-06-08',
    status: 'hired',
    address: 'San Jose, Urdaneta City, Pangasinan',
    placement: {
      startDate: '2026-06-24',
      salary: 18500,
      capturedAt: '2026-06-17T09:30:00.000Z',
    },
  },
  {
    id: 'app-1009',
    name: 'Lourdes Manalo',
    matchScore: 86,
    skills: ['Caregiving', 'Patient Assistance', 'First Aid'],
    education: 'TESDA - Caregiving NC II',
    distance: '9.3 km',
    age: 38,
    gender: 'Female',
    meetsBfoq: true,
    appliedDate: '2026-06-07',
    status: 'shortlisted',
    address: 'Bactad East, Urdaneta City, Pangasinan',
  },
]

const columns = [
  { id: 'inbox', title: 'Inbox', label: 'Pending', icon: MailCheck, empty: 'No pending applicants yet.' },
  { id: 'shortlisted', title: 'Shortlisted', label: 'Employer likes the profile', icon: Sparkles, empty: 'Shortlisted applicants appear here.' },
  { id: 'interviewing', title: 'Interviewing', label: 'Anti-ghosting notification sent', icon: CalendarDays, empty: 'No interviews scheduled.' },
  { id: 'hired', title: 'Hired', label: 'Placement capture required', icon: UserCheck, empty: 'No confirmed hires yet.' },
  { id: 'archived', title: 'Archived/Rejected', label: 'Closure notice sent', icon: Archive, empty: 'Archived applicants appear here.' },
]

const sortOptions = ['Highest Match Score', 'Newest', 'BFOQ Matches']

const placementInitialState = {
  startDate: '',
  salary: '',
}

export default function EmployerATSBoard() {
  const [applicants, setApplicants] = useState(applicantSeed)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('Highest Match Score')
  const [draggedId, setDraggedId] = useState(null)
  const [activeApplicant, setActiveApplicant] = useState(null)
  const [placementApplicant, setPlacementApplicant] = useState(null)
  const [placementForm, setPlacementForm] = useState(placementInitialState)
  const [placementErrors, setPlacementErrors] = useState({})
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
  }, [])

  const activeApplicants = applicants.filter((applicant) => applicant.status !== 'hired' && applicant.status !== 'archived')
  const hiredApplicants = applicants.filter((applicant) => applicant.status === 'hired')

  const visibleApplicants = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return applicants.filter((applicant) => {
      if (!query) return true

      return applicant.name.toLowerCase().includes(query)
        || applicant.skills.some((skill) => skill.toLowerCase().includes(query))
    })
  }, [applicants, searchQuery])

  const groupedApplicants = useMemo(() => {
    const groups = Object.fromEntries(columns.map((column) => [column.id, []]))

    for (const applicant of visibleApplicants) {
      groups[applicant.status]?.push(applicant)
    }

    groups.inbox = sortApplicants(groups.inbox, sortBy)
    return groups
  }, [visibleApplicants, sortBy])

  const showToast = (message, tone = 'success') => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)

    setToast({ message, tone })
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3200)
  }

  const requestPlacementCapture = (applicant) => {
    setPlacementApplicant(applicant)
    setPlacementForm(placementInitialState)
    setPlacementErrors({})
  }

  const moveApplicant = (applicantId, nextStatus, source = 'manual') => {
    const applicant = applicants.find((item) => item.id === applicantId)
    if (!applicant || applicant.status === nextStatus) return

    if (nextStatus === 'hired') {
      requestPlacementCapture(applicant)
      if (source === 'modal') {
        showToast('Placement details are required before this applicant can be marked as hired.', 'warning')
      }
      return
    }

    setApplicants((current) => current.map((item) => (
      item.id === applicantId ? { ...item, status: nextStatus } : item
    )))

    setActiveApplicant((current) => (
      current?.id === applicantId ? { ...current, status: nextStatus } : current
    ))

    if (nextStatus === 'interviewing') {
      showToast('Notification sent to Job Seeker for interview.')
    }

    if (nextStatus === 'archived') {
      showToast('Automated closure email sent to applicant.', 'warning')
    }
  }

  const onDrop = (event, columnId) => {
    event.preventDefault()
    const applicantId = event.dataTransfer.getData('text/plain') || draggedId
    if (!applicantId) return

    moveApplicant(applicantId, columnId, 'drag')
    setDraggedId(null)
  }

  const confirmPlacement = () => {
    const errors = validatePlacement(placementForm)
    setPlacementErrors(errors)

    if (Object.keys(errors).length) return

    const placement = {
      startDate: placementForm.startDate,
      salary: Number(placementForm.salary),
      capturedAt: new Date().toISOString(),
    }

    setApplicants((current) => current.map((item) => (
      item.id === placementApplicant.id ? { ...item, status: 'hired', placement } : item
    )))

    setActiveApplicant((current) => (
      current?.id === placementApplicant.id ? { ...current, status: 'hired', placement } : current
    ))

    showToast('Placement synced with the DOLE SPRS Urdaneta Registry.')
    setPlacementApplicant(null)
    setPlacementForm(placementInitialState)
    setPlacementErrors({})
  }

  const cancelPlacement = () => {
    setPlacementApplicant(null)
    setPlacementForm(placementInitialState)
    setPlacementErrors({})
  }

  const resetBoard = () => {
    setApplicants(applicantSeed)
    setSearchQuery('')
    setSortBy('Highest Match Score')
    setDraggedId(null)
    setActiveApplicant(null)
    setPlacementApplicant(null)
    setPlacementForm(placementInitialState)
    setPlacementErrors({})
    showToast('ATS demo board reset to the latest mock data.')
  }

  return (
    <div className="portal-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="portal-eyebrow">Applicant Tracking System</p>
          <h1 className="portal-title mt-1">Employer ATS Board</h1>
          <p className="portal-subtitle">
            Manage applicants through a transparent anti-ghosting hiring pipeline synced with PESO employment statistics.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MetricBadge label="Total Active Applicants" value={activeApplicants.length} tone="blue" />
          <MetricBadge label="Total Hired" value={hiredApplicants.length} tone="emerald" />
          <button
            type="button"
            onClick={resetBoard}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-900 hover:text-blue-900"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Demo
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
              placeholder="Search applicants by name or skill"
            />
          </div>

          <label className="flex min-w-64 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <Filter className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Sort Inbox</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none"
            >
              {sortOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-inner">
        <div className="flex min-h-[34rem] gap-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              applicants={groupedApplicants[column.id] ?? []}
              draggedId={draggedId}
              onDrop={onDrop}
              onDragStart={(applicantId) => setDraggedId(applicantId)}
              onDragEnd={() => setDraggedId(null)}
              onOpenProfile={setActiveApplicant}
            />
          ))}
        </div>
      </section>

      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}

      {activeApplicant && (
        <ProfileModal
          applicant={applicants.find((item) => item.id === activeApplicant.id) ?? activeApplicant}
          onClose={() => setActiveApplicant(null)}
          onMove={(status) => moveApplicant(activeApplicant.id, status, 'modal')}
        />
      )}

      {placementApplicant && (
        <PlacementCaptureModal
          applicant={placementApplicant}
          form={placementForm}
          errors={placementErrors}
          setForm={setPlacementForm}
          onClose={cancelPlacement}
          onConfirm={confirmPlacement}
        />
      )}
    </div>
  )
}

function KanbanColumn({
  column,
  applicants,
  draggedId,
  onDrop,
  onDragStart,
  onDragEnd,
  onOpenProfile,
}) {
  const Icon = column.icon

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDrop(event, column.id)}
      className={`flex w-[19rem] shrink-0 flex-col rounded-xl border bg-white/70 transition ${
        draggedId ? 'border-blue-200 ring-2 ring-blue-900/5' : 'border-slate-200'
      }`}
    >
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
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{applicants.length}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3">
        {applicants.length ? (
          applicants.map((applicant) => (
            <ApplicantCard
              key={applicant.id}
              applicant={applicant}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onOpenProfile={onOpenProfile}
            />
          ))
        ) : (
          <EmptyColumn icon={Icon} message={column.empty} />
        )}
      </div>
    </div>
  )
}

function ApplicantCard({ applicant, onDragStart, onDragEnd, onOpenProfile }) {
  const borderClass = matchBorderClass(applicant.matchScore)

  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', applicant.id)
        event.dataTransfer.effectAllowed = 'move'
        onDragStart(applicant.id)
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpenProfile(applicant)}
      className={`cursor-grab rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing ${borderClass} border-l-4`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{applicant.name}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Applied {formatDate(applicant.appliedDate)}</p>
        </div>
        <div className="rounded-xl bg-slate-950 px-2.5 py-1 text-xs font-black text-white">
          {applicant.matchScore}%
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {applicant.skills.slice(0, 3).map((skill) => (
          <span key={skill} className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">{skill}</span>
        ))}
        {applicant.skills.length > 3 && (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">+{applicant.skills.length - 3}</span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{applicant.distance}</span>
        <span className={`rounded-full px-2 py-1 text-[11px] font-black ${
          applicant.meetsBfoq
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-amber-50 text-amber-700'
        }`}>
          {applicant.meetsBfoq ? '✓ Meets Preferences' : '⚠ Outside BFOQ Preferences'}
        </span>
      </div>
    </button>
  )
}

function ProfileModal({ applicant, onClose, onMove }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6">
      <section className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">Full NSRP Profile</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">{applicant.name}</h2>
            <p className="mt-1 text-sm text-slate-500">Demographic data revealed for HR onboarding compliance.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="max-h-[calc(92vh-8rem)] overflow-y-auto px-5 py-5">
          <div className="grid gap-4 md:grid-cols-3">
            <ProfileStat icon={Sparkles} label="Match Score" value={`${applicant.matchScore}%`} />
            <ProfileStat icon={MapPin} label="Distance" value={applicant.distance} />
            <ProfileStat icon={Clock3} label="Applied" value={formatDate(applicant.appliedDate)} />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <ProfilePanel title="Identity">
              <Detail label="Age" value={`${applicant.age} years old`} />
              <Detail label="Gender" value={applicant.gender} />
              <Detail label="Full Address" value={applicant.address} />
            </ProfilePanel>

            <ProfilePanel title="Qualification Snapshot">
              <Detail label="Education" value={applicant.education} />
              <Detail label="BFOQ Preference" value={applicant.meetsBfoq ? 'Meets Preferences' : 'Outside BFOQ Preferences'} />
              <Detail label="Current Stage" value={stageLabel(applicant.status)} />
            </ProfilePanel>
          </div>

          <ProfilePanel title="Skills" className="mt-4">
            <div className="flex flex-wrap gap-2">
              {applicant.skills.map((skill) => (
                <span key={skill} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">{skill}</span>
              ))}
            </div>
          </ProfilePanel>

          {applicant.placement && (
            <ProfilePanel title="Placement Sync" className="mt-4">
              <Detail label="Start Date" value={formatDate(applicant.placement.startDate)} />
              <Detail label="Starting Salary" value={formatCurrency(applicant.placement.salary)} />
              <Detail label="Captured" value={formatDate(applicant.placement.capturedAt)} />
            </ProfilePanel>
          )}

          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            <div className="flex gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Full profile data is shown only after employer intent is established. Marking an applicant as Hired requires DOLE placement capture before the stage is saved.</p>
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-xs font-semibold text-slate-500">Move applicant without dragging</p>
          <div className="flex flex-wrap gap-2">
            {columns.map((column) => (
              <button
                key={column.id}
                type="button"
                onClick={() => onMove(column.id)}
                className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                  applicant.status === column.id
                    ? 'bg-blue-900 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:border-blue-900 hover:text-blue-900'
                }`}
              >
                {column.title}
              </button>
            ))}
          </div>
        </footer>
      </section>
    </div>
  )
}

function PlacementCaptureModal({ applicant, form, errors, setForm, onClose, onConfirm }) {
  const canConfirm = Boolean(form.startDate && Number(form.salary) > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
      <section className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="border-b border-slate-200 bg-emerald-50 px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">DOLE Placement Capture</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">{applicant.name}</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl border border-emerald-200 bg-white p-2 text-slate-500 hover:bg-emerald-50">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-3 text-sm leading-6 text-emerald-800">
            Congratulations on your new hire! Please provide placement details to sync with the DOLE SPRS Urdaneta Registry.
          </p>
        </header>

        <div className="space-y-4 px-5 py-5">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Start Date</span>
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
              aria-invalid={Boolean(errors.startDate)}
              className={`mt-2 w-full rounded-xl border px-3.5 py-3 text-sm outline-none focus:ring-2 ${
                errors.startDate
                  ? 'border-red-300 focus:border-red-600 focus:ring-red-600/10'
                  : 'border-slate-300 focus:border-emerald-700 focus:ring-emerald-700/10'
              }`}
            />
            {errors.startDate && <p className="mt-1.5 text-xs font-semibold text-red-600">{errors.startDate}</p>}
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Starting Salary</span>
            <input
              type="number"
              min="1"
              step="1"
              value={form.salary}
              onChange={(event) => setForm((current) => ({ ...current, salary: event.target.value }))}
              aria-invalid={Boolean(errors.salary)}
              className={`mt-2 w-full rounded-xl border px-3.5 py-3 text-sm outline-none focus:ring-2 ${
                errors.salary
                  ? 'border-red-300 focus:border-red-600 focus:ring-red-600/10'
                  : 'border-slate-300 focus:border-emerald-700 focus:ring-emerald-700/10'
              }`}
              placeholder="0.00"
            />
            {errors.salary && <p className="mt-1.5 text-xs font-semibold text-red-600">{errors.salary}</p>}
          </label>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-slate-500">
            Later
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition ${
              canConfirm ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-emerald-700/80 hover:bg-emerald-800'
            }`}
          >
            <Send className="h-4 w-4" />
            Confirm Placement
          </button>
        </footer>
      </section>
    </div>
  )
}

function Toast({ message, tone, onClose }) {
  const success = tone === 'success'

  return (
    <div className={`fixed right-4 top-24 z-50 flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${
      success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
    }`}>
      {success ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <Archive className="mt-0.5 h-5 w-5 shrink-0" />}
      <p className="text-sm font-bold leading-6">{message}</p>
      <button type="button" onClick={onClose} className="ml-auto rounded p-0.5 opacity-70 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
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

function EmptyColumn({ icon, message }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
      {createElement(icon, { className: 'h-7 w-7 text-slate-300' })}
      <p className="mt-3 text-sm font-bold text-slate-500">{message}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">Drag applicant cards here as the hiring process moves.</p>
    </div>
  )
}

function ProfileStat({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      {createElement(icon, { className: 'h-5 w-5 text-blue-900' })}
      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  )
}

function ProfilePanel({ title, className = '', children }) {
  return (
    <section className={`rounded-xl border border-slate-200 p-4 ${className}`}>
      <h3 className="text-sm font-black text-slate-900">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  )
}

function validatePlacement(form) {
  const errors = {}
  const salary = Number(form.salary)

  if (!form.startDate) {
    errors.startDate = 'Start Date is required before syncing placement.'
  }

  if (!form.salary) {
    errors.salary = 'Starting Salary is required before syncing placement.'
  } else if (Number.isNaN(salary) || salary <= 0) {
    errors.salary = 'Starting Salary must be greater than zero.'
  }

  return errors
}

function sortApplicants(items, sortBy) {
  const sorted = [...items]

  if (sortBy === 'Newest') {
    return sorted.sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate))
  }

  if (sortBy === 'BFOQ Matches') {
    return sorted.sort((a, b) => Number(b.meetsBfoq) - Number(a.meetsBfoq) || b.matchScore - a.matchScore)
  }

  return sorted.sort((a, b) => b.matchScore - a.matchScore)
}

function matchBorderClass(score) {
  if (score >= 90) return 'border-l-green-500'
  if (score >= 70) return 'border-l-blue-500'
  if (score >= 50) return 'border-l-amber-500'
  return 'border-l-red-500'
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function stageLabel(status) {
  return columns.find((column) => column.id === status)?.title ?? status
}
