import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import { Card, ErrorState, LoadingSkeleton } from '@/components/ui'
import { getEmployerCalendarEvents } from '@/services/employerApplicationService'

export default function InterviewCalendarPage() {
  const [dateRange, setDateRange] = useState(() => {
    // Default to current month view
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()
    return { start, end }
  })

  const eventsQuery = useQuery({
    queryKey: ['employerCalendarEvents', dateRange.start, dateRange.end],
    queryFn: () => getEmployerCalendarEvents({ start: dateRange.start, end: dateRange.end }),
    staleTime: 60_000,
    retry: false,
  })

  const events = (eventsQuery.data?.events ?? []).map(event => ({
    id: event.id,
    title: event.title || 'Interview',
    start: event.start,
    end: event.end,
    url: event.url,
    extendedProps: {
      url: event.url
    }
  }))

  const handleDatesSet = (dateInfo) => {
    setDateRange({
      start: dateInfo.startStr,
      end: dateInfo.endStr
    })
  }

  const handleEventClick = (info) => {
    if (info.event.url) {
      info.jsEvent.preventDefault() // prevent default navigation if fullcalendar tries it
      window.open(info.event.url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="portal-page">
      <div>
        <p className="portal-eyebrow">Recruitment Management</p>
        <h1 className="portal-title mt-1">Interview Calendar</h1>
        <p className="portal-subtitle">Interviews scheduled from the Applicants board, straight from your i-PESO account.</p>
      </div>

      <Card className="p-4 sm:p-6 overflow-hidden bg-white shadow-sm border border-slate-200 rounded-3xl">
        {eventsQuery.isError ? (
          <ErrorState
            description="We couldn't load your interviews. Check your connection and try again."
            error={eventsQuery.error}
            onRetry={() => eventsQuery.refetch()}
          />
        ) : (
          <div className="calendar-container w-full h-[700px] relative">
            {eventsQuery.isLoading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-2xl">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-navy border-t-transparent" />
              </div>
            )}
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
              }}
              events={events}
              datesSet={handleDatesSet}
              eventClick={handleEventClick}
              eventContent={(arg) => (
                <div className="overflow-hidden p-1 text-xs text-white rounded bg-brand-navy shadow-sm border border-transparent w-full">
                  <div className="font-bold truncate">{arg.event.title}</div>
                  <div className="text-[10px] truncate opacity-80">{arg.timeText}</div>
                </div>
              )}
              height="100%"
            />
          </div>
        )}
      </Card>
    </div>
  )
}
