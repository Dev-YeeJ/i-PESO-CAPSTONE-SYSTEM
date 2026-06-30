import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardHeader } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import { adminService } from '@/services/adminService'

const emptyForm = {
  title: '',
  description: '',
  venue: '',
  start_date: '',
  end_date: '',
  start_time: '08:00',
  end_time: '17:00',
  sector: 'local',
  status: 'upcoming',
}

export default function JobFairFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return

    let active = true
    setLoading(true)
    adminService.getJobFairDetail(id)
      .then((fair) => {
        if (!active) return
        setForm({
          title: fair.title ?? '',
          description: fair.description ?? '',
          venue: fair.venue ?? '',
          start_date: fair.start_date ?? fair.event_date ?? '',
          end_date: fair.end_date ?? fair.start_date ?? fair.event_date ?? '',
          start_time: (fair.start_time ?? '08:00').slice(0, 5),
          end_time: (fair.end_time ?? '17:00').slice(0, 5),
          sector: fair.sector ?? 'local',
          status: fair.status ?? 'upcoming',
        })
        setMetrics(fair.metrics ?? null)
      })
      .catch((requestError) => setError(requestError.response?.data?.message ?? 'Unable to load job fair.'))
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id])

  const handleChange = useCallback((event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }, [])

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    const payload = {
      ...form,
      event_date: form.start_date,
    }

    try {
      if (id) {
        await adminService.updateJobFair(id, payload)
      } else {
        await adminService.createJobFair(payload)
      }
      navigate('/admin/job-fairs')
    } catch (requestError) {
      const errors = requestError.response?.data?.errors
      setError(errors ? Object.values(errors).flat().join(' ') : requestError.response?.data?.message ?? 'Failed to save job fair.')
    } finally {
      setSubmitting(false)
    }
  }, [form, id, navigate])

  return (
    <div className="portal-page">
      <PageHeader
        title={id ? 'Edit Job Fair' : 'Create Job Fair'}
        subtitle="Define the event scope used by RSVP passes, booth queues, and DOLE reports."
        eyebrow="Government & DOLE"
        actions={[{ label: 'Back', onClick: () => navigate('/admin/job-fairs'), variant: 'secondary' }]}
      />

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader title="Event Details" subtitle="Use this as the official source for the fair’s QR passes and reports." />
          {loading ? (
            <div className="py-16 text-center text-sm font-semibold text-slate-500">Loading event...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700">Title</label>
                <input name="title" value={form.title} onChange={handleChange} required className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={4} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700">Venue</label>
                <input name="venue" value={form.venue} onChange={handleChange} required className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-bold text-slate-700">Start Date</label>
                  <input type="date" name="start_date" value={form.start_date} onChange={handleChange} required className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700">End Date</label>
                  <input type="date" name="end_date" value={form.end_date} onChange={handleChange} required className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700">Start Time</label>
                  <input type="time" name="start_time" value={form.start_time} onChange={handleChange} required className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700">End Time</label>
                  <input type="time" name="end_time" value={form.end_time} onChange={handleChange} required className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-bold text-slate-700">Sector</label>
                  <select name="sector" value={form.sector} onChange={handleChange} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
                    <option value="local">Local</option>
                    <option value="overseas">Overseas</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700">Status</label>
                  <select name="status" value={form.status} onChange={handleChange} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
                <Button type="submit" icon={Save} disabled={submitting}>{submitting ? 'Saving...' : 'Save Job Fair'}</Button>
                <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/admin/job-fairs')}>Cancel</Button>
              </div>
            </form>
          )}
        </Card>

        <Card>
          <CardHeader title="Live Readiness" subtitle="Available after employers and seekers start joining." />
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Employers', metrics?.employers_joined ?? 0],
              ['Vacancies', metrics?.vacancies ?? 0],
              ['RSVPs', metrics?.seekers_rsvped ?? 0],
              ['HOTS', metrics?.hots ?? 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xl font-black text-slate-950">{value}</p>
                <p className="text-[11px] font-extrabold uppercase text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
