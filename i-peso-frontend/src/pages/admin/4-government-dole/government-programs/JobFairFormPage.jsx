// i-peso-frontend/src/pages/admin/job-fairs/JobFairFormPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageHeader from '@/pages/admin/_components/PageHeader'
import { adminService } from '@/services/adminService'

export default function JobFairFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '', description: '', venue: '', event_date: '', start_time: '', end_time: '', status: 'upcoming'
  })
  const [submitting, setSubmitting] = useState(false)

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      if (id) {
        await adminService.updateJobFair(id, form)
      } else {
        await adminService.createJobFair(form)
      }
      navigate('/admin/job-fairs')
    } catch (err) {
      console.error(err)
      alert('Failed to save job fair')
    } finally {
      setSubmitting(false)
    }
  }, [id, form, navigate])

  return (
    <div className="space-y-6">
      <PageHeader title={id ? 'Edit Job Fair' : 'Create Job Fair'} />
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Title</label>
          <input type="text" name="title" value={form.title} onChange={handleChange} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} required rows={4} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Venue</label>
          <input type="text" name="venue" value={form.venue} onChange={handleChange} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Event Date</label>
            <input type="date" name="event_date" value={form.event_date} onChange={handleChange} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Start Time</label>
            <input type="time" name="start_time" value={form.start_time} onChange={handleChange} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Time</label>
            <input type="time" name="end_time" value={form.end_time} onChange={handleChange} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <button type="submit" disabled={submitting} className="w-full bg-blue-700 hover:bg-blue-800 text-white py-2 rounded-lg font-semibold">
          {submitting ? 'Saving...' : (id ? 'Update Job Fair' : 'Create Job Fair')}
        </button>
      </form>
    </div>
  )
}