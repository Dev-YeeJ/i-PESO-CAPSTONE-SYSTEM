import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui'

export default function JobFairsCalendar({ fairs }) {
  const navigate = useNavigate()

  const events = (fairs || []).map((fair) => ({
    id: fair.job_fair_id,
    title: fair.title,
    start: fair.start_date,
    end: fair.end_date ? new Date(new Date(fair.end_date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] : fair.start_date,
    extendedProps: {
      status: fair.status,
      venue: fair.venue
    }
  }))

  const handleEventClick = (info) => {
    navigate(`/admin/job-fairs/${info.event.id}`)
  }

  return (
    <Card className="p-4 sm:p-6 overflow-hidden bg-white shadow-sm border border-slate-200 rounded-3xl">
      <div className="calendar-container w-full h-[600px]">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
          }}
          events={events}
          eventClick={handleEventClick}
          eventContent={(arg) => (
            <div className="overflow-hidden p-1 text-xs text-white rounded bg-brand-navy shadow-sm border border-transparent">
              <div className="font-bold truncate">{arg.event.title}</div>
              <div className="text-[10px] truncate opacity-80">{arg.event.extendedProps.venue}</div>
            </div>
          )}
          height="100%"
        />
      </div>
    </Card>
  )
}
