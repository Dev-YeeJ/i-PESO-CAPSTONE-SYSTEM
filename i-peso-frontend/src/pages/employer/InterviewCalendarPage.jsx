import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import { CalendarPlus, ChevronLeft, ChevronRight, Video } from 'lucide-react'
import { Button, Card, ErrorState } from '@/components/ui'
import { getEmployerCalendarEvents } from '@/services/employerApplicationService'
import { endedLabel } from '@/utils/interview'
import PortalPageHeader from '@/components/shell/PortalPageHeader'

const VIEWS = [
  { id: 'dayGridMonth', label: 'Month' },
  { id: 'timeGridWeek', label: 'Week' },
  { id: 'timeGridDay', label: 'Day' },
]
const VIEW_KEY = 'ipeso.calendar.view'

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
      ended: event.phase === 'ended',
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
                const { ended, endedLabel: endedText, seekerName, jobTitle, joinUrl } = arg.event.extendedProps
                return (
                  <div className={`w-full cursor-pointer overflow-hidden rounded border p-1 text-xs ${ended ? 'border-slate-300 bg-slate-100 text-slate-700' : 'border-transparent bg-brand-navy text-white shadow-sm'}`}>
                    <div className="flex items-center gap-1 truncate font-bold">
                      {joinUrl && <Video className="h-3 w-3 shrink-0" aria-label="Online" />}
                      <span className="truncate">{arg.timeText} {seekerName || arg.event.title}</span>
                    </div>
                    {jobTitle && seekerName && <div className={`truncate text-[10px] ${ended ? '' : 'opacity-80'}`}>{jobTitle}</div>}
                    {ended && <div className="truncate text-[10px]">{endedText}</div>}
                  </div>
                )
              }}
              height="100%"
            />
          </div>
        )}

        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-navy" aria-hidden="true" />Scheduled</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-slate-300 bg-slate-100" aria-hidden="true" />Held</span>
          <span className="flex items-center gap-1.5"><Video className="h-3 w-3" aria-hidden="true" />Online, the applicant page has the join link</span>
          <span>Select an interview to open the applicant.</span>
        </p>
      </Card>
    </div>
  )
}
