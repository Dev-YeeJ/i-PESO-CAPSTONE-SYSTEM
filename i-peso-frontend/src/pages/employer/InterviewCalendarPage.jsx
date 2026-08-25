import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarCheck, Clock3, ExternalLink } from 'lucide-react'
import { Button, Card, CardHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui'
import { getEmployerCalendarEvents } from '@/services/employerApplicationService'

const RANGE_DAYS = 60

function formatEventRange(startStr, endStr) {
  const isAllDay = !startStr.includes('T')
  const start = new Date(startStr)
  if (isAllDay) {
    return start.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  const end = new Date(endStr)
  const dateLabel = start.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })
  const startTime = start.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
  const endTime = end.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
  return `${dateLabel} · ${startTime}–${endTime}`
}

export default function InterviewCalendarPage() {
  const { start, end } = useMemo(() => {
    const from = new Date()
    from.setHours(0, 0, 0, 0)
    const to = new Date(from)
    to.setDate(to.getDate() + RANGE_DAYS)
    return { start: from.toISOString(), end: to.toISOString() }
  }, [])

  const eventsQuery = useQuery({
    queryKey: ['employerCalendarEvents', start, end],
    queryFn: () => getEmployerCalendarEvents({ start, end }),
    staleTime: 60_000,
    retry: false,
  })

  const events = eventsQuery.data?.events ?? []

  return (
    <div className="portal-page">
      <div>
        <p className="portal-eyebrow">Recruitment Management</p>
        <h1 className="portal-title mt-1">Interview Calendar</h1>
        <p className="portal-subtitle">Interviews scheduled from the Applicants board, straight from your i-PESO account.</p>
      </div>

      <Card padding="none">
        <div className="p-5 sm:p-6">
          {eventsQuery.isLoading ? (
            <LoadingSkeleton variant="card" rows={4} />
          ) : eventsQuery.isError ? (
            <ErrorState
              description="We couldn't load your interviews. Check your connection and try again."
              error={eventsQuery.error}
              onRetry={() => eventsQuery.refetch()}
            />
          ) : !events.length ? (
            <EmptyState
              icon={CalendarCheck}
              title="No interviews scheduled"
              description="Interviews you schedule from the Applicants board will show up here."
            />
          ) : (
            <>
              <CardHeader title="Upcoming interviews" subtitle={`Next ${RANGE_DAYS} days`} />
              <ul className="space-y-3">
                {events.map((event) => (
                  <li
                    key={event.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">{event.title || 'Interview'}</p>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatEventRange(event.start, event.end)}
                      </p>
                    </div>
                    {event.url && (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={ExternalLink}
                        onClick={() => window.open(event.url, '_blank', 'noopener,noreferrer')}
                      >
                        Join call
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
