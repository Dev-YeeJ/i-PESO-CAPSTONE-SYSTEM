// i-peso-frontend/src/pages/admin/programs/ProgramFormPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageHeader from '@/components/admin/PageHeader'
import { adminService } from '@/services/adminService'

export default function ProgramFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    program_name: '', description: '', target_beneficiaries: '', schedule: '', slot_limit: '', status: 'open'
  })
  const [loading, setLoading] = useState(!!id)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (id) {
      adminService.getProgramDetail(id).then(d => {
        setForm(d)
        setLoading(false)
      }).catch(e => {
        console.error(e)
        setLoading(false)
      })
    }
  }, [id])

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      if (id) {
        await adminService.updateProgram(id, form)
      } else {
        await adminService.createProgram(form)
      }
      navigate('/admin/programs')
    } catch (err) {
      console.error(err)
      alert('Failed to save program')
    } finally {
      setSubmitting(false)
    }
  }, [id, form, navigate])

  if (loading) return <div className="text-center py-8">Loading...</div>

  return (
    <div className="space-y-6">
      <PageHeader title={id ? 'Edit Program' : 'Create Program'} />
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Program Name</label>
          <input type="text" name="program_name" value={form.program_name} onChange={handleChange} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} required rows={4} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Target Beneficiaries</label>
          <input type="text" name="target_beneficiaries" value={form.target_beneficiaries} onChange={handleChange} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Schedule</label>
            <input type="datetime-local" name="schedule" value={form.schedule} onChange={handleChange} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Slot Limit</label>
            <input type="number" name="slot_limit" value={form.slot_limit} onChange={handleChange} required min="1" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <button type="submit" disabled={submitting} className="w-full bg-blue-700 hover:bg-blue-800 text-white py-2 rounded-lg font-semibold">
          {submitting ? 'Saving...' : (id ? 'Update Program' : 'Create Program')}
        </button>
      </form>
    </div>
  )
}