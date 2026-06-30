import { useEffect, useState } from 'react'
import { CalendarDays, MapPin, TicketCheck, UsersRound } from 'lucide-react'
import { AlertBox, Button, Card, CardHeader } from '@/components/ui'
import DigitalQRPass from './DigitalQRPass'
import { listJobFairs, rsvpToJobFair } from '@/services/jobFairService'

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : 'TBD'

export default function JobFairFeed() {
  const [fairs, setFairs] = useState([])
  const [selectedPass, setSelectedPass] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listJobFairs()
      setFairs(data)
      setSelectedPass(data.find((fair) => fair.pass)?.pass ?? null)
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to load job fairs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const rsvp = async (fair) => {
    setError('')
    try {
      const response = await rsvpToJobFair(fair.job_fair_id)
      setSelectedPass(response.pass)
      setFairs((current) => current.map((item) => (
        item.job_fair_id === fair.job_fair_id ? { ...item, is_rsvped: true, pass: response.pass } : item
      )))
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to RSVP for this fair.')
    }
  }

  return (
    <div className="portal-page">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="portal-eyebrow">Digital Job Fair</p>
          <h1 className="portal-title mt-1">Job Fair Feed</h1>
          <p className="portal-subtitle">RSVP with your verified NSRP profile and keep your QR pass ready for booth scanning.</p>
        </div>
      </div>

      {error && <AlertBox variant="danger" title="Job fair action failed">{error}</AlertBox>}
      {selectedPass && <DigitalQRPass pass={selectedPass} />}

      <Card padding="none">
        <div className="p-5 sm:p-6">
          <CardHeader title="Upcoming Events" subtitle="Your pass is generated immediately after RSVP." />
        </div>
        {loading ? (
          <div className="border-t border-slate-200 p-10 text-center text-sm font-semibold text-slate-500">Loading job fairs...</div>
        ) : fairs.length === 0 ? (
          <div className="border-t border-slate-200 px-6 py-14 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-3 font-extrabold text-slate-900">No upcoming job fairs</p>
            <p className="mt-1 text-sm text-slate-500">Check again when PESO publishes the next event.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 border-t border-slate-200">
            {fairs.map((fair) => (
              <div key={fair.job_fair_id} className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-extrabold text-slate-950">{fair.title}</h2>
                    <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-extrabold uppercase text-blue-700">{fair.sector}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{fair.description}</p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-slate-400" />{formatDate(fair.start_date)} to {formatDate(fair.end_date)}</span>
                    <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" />{fair.venue}</span>
                    <span className="inline-flex items-center gap-1.5"><UsersRound className="h-4 w-4 text-slate-400" />{fair.metrics?.employers_joined ?? 0} employers</span>
                  </div>
                </div>
                <Button
                  icon={TicketCheck}
                  variant={fair.is_rsvped ? 'outline' : 'primary'}
                  onClick={() => fair.is_rsvped ? setSelectedPass(fair.pass) : rsvp(fair)}
                >
                  {fair.is_rsvped ? 'View Pass' : 'RSVP'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
