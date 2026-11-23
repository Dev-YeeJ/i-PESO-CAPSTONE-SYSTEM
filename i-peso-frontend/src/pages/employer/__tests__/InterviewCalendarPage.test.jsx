import { useEffect } from 'react'
import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils'
import { getEmployerCalendarEvents } from '@/services/employerApplicationService'
import InterviewCalendarPage from '../InterviewCalendarPage'

vi.mock('@/services/employerApplicationService', () => ({ getEmployerCalendarEvents: vi.fn() }))

// FullCalendar can't lay out in jsdom. This stand-in reports a visible range once
// and draws each event through the page's own eventContent, which is what we test.
vi.mock('@fullcalendar/react', () => ({
  default: function FakeCalendar({ events, eventContent, datesSet }) {
    useEffect(() => {
      datesSet({ startStr: '2026-11-09', endStr: '2026-11-16', view: { title: 'Nov 9 – 15, 2026', type: 'timeGridWeek' } })
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
    return (
      <div data-testid="calendar">
        {events.map((event) => (
          <div key={event.id} data-testid={`event-${event.id}`}>
            {eventContent({ event: { title: event.title, extendedProps: event.extendedProps }, timeText: '9:00' })}
          </div>
        ))}
      </div>
    )
  },
}))
vi.mock('@fullcalendar/daygrid', () => ({ default: {} }))
vi.mock('@fullcalendar/timegrid', () => ({ default: {} }))
vi.mock('@fullcalendar/interaction', () => ({ default: {} }))

const NOW = new Date('2026-11-10T09:15:00+08:00')
const event = (id, startIso, extra = {}) => ({
  id, title: 'Interview', start: startIso, end: new Date(new Date(startIso).getTime() + 60 * 60_000).toISOString(),
  phase: 'upcoming', mode_of_interview: 'online', seeker_name: `Seeker ${id}`, job_title: 'Welder', application_id: Number(id), ...extra,
})

describe('InterviewCalendarPage status labels', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    getEmployerCalendarEvents.mockResolvedValue({
      events: [
        event('1', '2026-11-10T09:00:00+08:00', { url: 'https://meet.jit.si/room-1' }), // started 15 minutes ago
        event('2', '2026-11-10T07:00:00+08:00', { phase: 'ended' }),
        event('3', '2026-11-10T14:00:00+08:00'),
      ],
    })
  })
  afterEach(() => vi.useRealTimers())

  it('marks the interview in progress as "Happening now" in its calendar block, by the clock', async () => {
    renderWithProviders(<InterviewCalendarPage />, { route: '/employer/calendar' })

    const live = await screen.findByTestId('event-1')
    expect(within(live).getByText('Happening now')).toBeInTheDocument()
    expect(live.firstChild).toHaveClass('bg-emerald-600')
    expect(within(screen.getByTestId('event-2')).getByText('Call ended')).toBeInTheDocument()
    expect(within(screen.getByTestId('event-3')).queryByText('Happening now')).not.toBeInTheDocument()
  })

  it('shows today at a glance with a join link, and a legend for every status', async () => {
    renderWithProviders(<InterviewCalendarPage />, { route: '/employer/calendar' })

    const today = await screen.findByRole('region', { name: "Today's interviews" })
    expect(within(today).getByText('Seeker 1, Welder')).toBeInTheDocument()
    expect(within(today).getByRole('link', { name: /Join call/ })).toHaveAttribute('href', 'https://meet.jit.si/room-1')
    expect(within(today).getByRole('button', { name: 'Open applicant' })).toBeInTheDocument()
    expect(within(today).getByText(/Next today:/).parentElement).toHaveTextContent('Seeker 3, Welder')

    // Today's window is asked for as Manila midnight to midnight, in UTC (how times are stored).
    expect(getEmployerCalendarEvents).toHaveBeenCalledWith({ start: '2026-11-09 16:00:00', end: '2026-11-10 16:00:00' })

    for (const label of ['Upcoming', 'Happening now', 'Call ended / Interview ended']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
  })
})
