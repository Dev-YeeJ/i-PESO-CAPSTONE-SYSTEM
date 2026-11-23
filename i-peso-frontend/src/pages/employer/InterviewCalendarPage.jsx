import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import { CalendarPlus, ChevronLeft, ChevronRight, ExternalLink, Video } from 'lucide-react'
import { Button, Card, ErrorState } from '@/components/ui'
import { getEmployerCalendarEvents } from '@/services/employerApplicationService'
import { calendarEventPhase, endedLabel, formatInterviewMode } from '@/utils/interview'
import { useNow } from '@/hooks/useNow'
import LiveDot from '@/components/interview/LiveDot'
import PortalPageHeader from '@/components/shell/PortalPageHeader'

const VIEWS = [
  { id: 'dayGridMonth', label: 'Month' },
  { id: 'timeGridWeek', label: 'Week' },
  { id: 'timeGridDay', label: 'Day' },
]
const VIEW_KEY = 'ipeso.calendar.view'

// Event look per live phase. "Happening now" also gets its own first line, so the
// status survives the short blocks of the Week and Day views.
const EVENT_TONES = {
  upcoming: 'border-transparent bg-brand-navy text-white shadow-sm',
  in_progress: 'border-emerald-700 bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300',
  ended: 'border-slate-300 bg-slate-100 text-slate-700',
}

const timeOf = (iso) => new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' })

/** Today in Manila as a UTC window ("YYYY-MM-DD HH:mm:ss"), which is how interview times are stored. */
function manilaTodayWindow(now) {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(now)
  const [y, m, d] = ymd.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, d) - 8 * 60 * 60 * 1000)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  const sql = (date) => date.toISOString().slice(0, 19).replace('T', ' ')
  return { day: ymd, start: sql(start), end: sql(end) }
}

const readView = () => {
  try {
    const saved = window.localStorage.getItem(VIEW_KEY)
    return VIEWS.some((view) => view.id === saved) ? saved : 'timeGridWeek'
  } catch {
    return 'timeGridWeek'
  }
}

export default function InterviewCalendarPage() {
  const navigate = useNavigate()
  const calendarRef = useRef(null)
  const [initialView] = useState(readView)
  const [view, setView] = useState(initialView)
  const [title, setTitle] = useState('')
  const [dateRange, setDateRange] = useState(null)
  // Phases are re-checked every 30 seconds, so the page flips Upcoming → Happening now → Call ended.
  const now = useNow()

  const eventsQuery = useQuery({
    queryKey: ['employerCalendarEvents', dateRange?.start, dateRange?.end],
    queryFn: () => getEmployerCalendarEvents({ start: dateRange.start, end: dateRange.end }),
    enabled: Boolean(dateRange),
    staleTime: 60_000,
    retry: false,
  })

  const events = (eventsQuery.data?.events ?? []).map((event) => ({
    id: event.id,
    title: event.title || 'Interview',
    start: event.start,
    end: event.end,
    extendedProps: {
      joinUrl: event.url,
      applicationId: event.application_id,
      seekerName: event.seeker_name,
      jobTitle: event.job_title,
      phase: calendarEventPhase(event, now),
      endedLabel: endedLabel(event),
    },
  }))

  const api = () => calendarRef.current?.getApi()

  // FullCalendar reports every navigation here: keep the toolbar title and
  // the fetched range in step with what is on screen.
  const handleDatesSet = (info) => {
    setTitle(info.view.title)
    setView(info.view.type)
    setDateRange({ start: info.startStr, end: info.endStr })
  }

  const changeView = (next) => {
    api()?.changeView(next)
    try { window.localStorage.setItem(VIEW_KEY, next) } catch { /* not remembered in a private window */ }
  }

  const handleEventClick = (info) => {
    info.jsEvent.preventDefault()
    const { applicationId } = info.event.extendedProps
    if (applicationId) navigate(`/employer/ats/applicant/${applicationId}`)
  }

  return (
    <div className="portal-page">
      <PortalPageHeader
        title="Interview calendar"
        subtitle="Every interview you scheduled from Applicants. Applicants get a notification for each change."
      >
        <Button to="/employer/ats" icon={CalendarPlus}>Schedule interview</Button>
      </PortalPageHeader>

      <TodayInterviews now={now} onOpen={(applicationId) => navigate(`/employer/ats/applicant/${applicationId}`)} />

      <Card className="overflow-hidden p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => api()?.prev()} aria-label="Previous" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => api()?.today()} className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus">
              Today
            </button>
            <button type="button" onClick={() => api()?.next()} aria-label="Next" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <h2 className="ml-2 text-lg font-bold text-slate-900" aria-live="polite">{title}</h2>
          </div>
          <div className="inline-flex self-start rounded-lg border border-slate-200 bg-slate-50 p-0.5 sm:self-auto" role="group" aria-label="Calendar view">
            {VIEWS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => changeView(option.id)}
                aria-pressed={view === option.id}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${view === option.id ? 'bg-white text-brand-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {eventsQuery.isError ? (
          <ErrorState
            description="We couldn't load your interviews. Check your connection and try again."
            error={eventsQuery.error}
            onRetry={() => eventsQuery.refetch()}
          />
        ) : (
          <div className="calendar-container relative h-[700px] w-full">
            {eventsQuery.isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/70">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-navy border-t-transparent" />
              </div>
            )}
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={initialView}
              headerToolbar={false}
              nowIndicator
              slotMinTime="07:00:00"
              slotMaxTime="20:00:00"
              allDaySlot={false}
              events={events}
              datesSet={handleDatesSet}
              eventClick={handleEventClick}
              eventContent={(arg) => {
                const { phase, endedLabel: endedText, seekerName, jobTitle, joinUrl } = arg.event.extendedProps
                const status = phase === 'in_progress' ? 'Happening now' : phase === 'ended' ? endedText : 'Upcoming'
                return (
                  <div
                    className={`h-full w-full cursor-pointer overflow-hidden rounded border p-1 text-xs leading-tight ${EVENT_TONES[phase] ?? EVENT_TONES.upcoming}`}
                    title={[status, `${arg.timeText} ${seekerName || arg.event.title}`, jobTitle].filter(Boolean).join(' · ')}
                  >
                    {phase === 'in_progress' && (
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide"><LiveDot light />Happening now</div>
                    )}
                    {phase === 'ended' && <div className="truncate text-[10px] font-semibold">{endedText}</div>}
                    <div className="flex items-center gap-1 truncate font-bold">
                      {joinUrl && <Video className="h-3 w-3 shrink-0" aria-label="Online" />}
                      <span className="truncate">{arg.timeText} {seekerName || arg.event.title}</span>
                    </div>
                    {jobTitle && seekerName && <div className="truncate text-[10px] opacity-80">{jobTitle}</div>}
                  </div>
                )
              }}
              height="100%"
              eventBackgroundColor="transparent"
              eventBorderColor="transparent"
            />
          </div>
        )}

        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-navy" aria-hidden="true" />Upcoming</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" aria-hidden="true" />Happening now</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-slate-300 bg-slate-100" aria-hidden="true" />Call ended / Interview ended</span>
          <span className="flex items-center gap-1.5"><Video className="h-3 w-3" aria-hidden="true" />Online, the applicant page has the join link</span>
          <span>Select an interview to open the applicant.</span>
        </p>
      </Card>
    </div>
  )
}

/**
 * Today at a glance, whatever week or view the calendar shows: any interview
 * happening now (with its join link), else the next one today.
 */
function TodayInterviews({ now, onOpen }) {
  const today = manilaTodayWindow(now)
  const todayQuery = useQuery({
    queryKey: ['employerCalendarEvents', 'today', today.day],
    queryFn: () => getEmployerCalendarEvents({ start: today.start, end: today.end }),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  })

  const events = (todayQuery.data?.events ?? []).map((event) => ({ ...event, livePhase: calendarEventPhase(event, now) }))
  const live = events.filter((event) => event.livePhase === 'in_progress')
  const next = events.filter((event) => event.livePhase === 'upcoming').sort((a, b) => new Date(a.start) - new Date(b.start))[0]
  if (!live.length && !next) return null

  return (
    <section aria-label="Today's interviews" className="space-y-2">
      {live.map((event) => (
        <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white"><LiveDot light />Happening now</span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{event.seeker_name || event.title}{event.job_title ? `, ${event.job_title}` : ''}</p>
              <p className="text-xs text-slate-600">{timeOf(event.start)} – {timeOf(event.end)} · {formatInterviewMode(event.mode_of_interview)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {event.url && (
              <a href={event.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
                Join call <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
            {event.application_id && <Button size="sm" variant="outline" onClick={() => onOpen(event.application_id)}>Open applicant</Button>}
          </div>
        </div>
      ))}
      {next && (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">Next today:</span> {timeOf(next.start)} · {next.seeker_name || next.title}{next.job_title ? `, ${next.job_title}` : ''}
        </p>
      )}
    </section>
  )
}
