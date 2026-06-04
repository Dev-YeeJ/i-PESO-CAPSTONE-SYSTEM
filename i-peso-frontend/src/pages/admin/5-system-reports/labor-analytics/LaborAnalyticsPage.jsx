// i-peso-frontend/src/pages/admin/reports/ReportsPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/pages/admin/_components/PageHeader'
import DataTable from '@/pages/admin/_components/DataTable'
import { adminService } from '@/services/adminService'

export default function ReportsPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', report_category: 'placement', coverage_start: '', coverage_end: '' })
  const [generating, setGenerating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    adminService.getReports().then(d => {
      setReports(d.data || [])
      setLoading(false)
    }).catch(e => {
      console.error(e)
      setLoading(false)
    })
  }, [])

  const handleGenerate = useCallback(async (e) => {
    e.preventDefault()
    try {
      setGenerating(true)
      const result = await adminService.generateReport(form)
      setReports(prev => [result.report, ...prev])
      setForm({ title: '', report_category: 'placement', coverage_start: '', coverage_end: '' })
    } catch (err) {
      console.error(err)
      alert('Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }, [form])

  return (
    <div className="space-y-8">
      <PageHeader title="Reports" subtitle="Generate and view analytics reports" />

      {/* Generate Form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="font-bold text-lg mb-4">Generate New Report</h3>
        <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input type="text" placeholder="Report Title" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required className="px-3 py-2 border border-slate-300 rounded-lg" />
          <select value={form.report_category} onChange={(e) => setForm({...form, report_category: e.target.value})} className="px-3 py-2 border border-slate-300 rounded-lg">
            <option value="placement">Placement</option>
            <option value="registration">Registration</option>
            <option value="vacancies">Vacancies</option>
            <option value="programs">Programs</option>
          </select>
          <input type="date" value={form.coverage_start} onChange={(e) => setForm({...form, coverage_start: e.target.value})} required className="px-3 py-2 border border-slate-300 rounded-lg" />
          <input type="date" value={form.coverage_end} onChange={(e) => setForm({...form, coverage_end: e.target.value})} required className="px-3 py-2 border border-slate-300 rounded-lg" />
          <button type="submit" disabled={generating} className="bg-blue-700 text-white rounded-lg font-semibold">
            {generating ? 'Generating...' : 'Generate'}
          </button>
        </form>
      </div>

      {/* Reports List */}
      <div>
        <h3 className="font-bold text-lg mb-4">Saved Reports</h3>
        <DataTable
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'report_category', label: 'Category' },
            { key: 'coverage_start', label: 'Coverage Start', render: (d) => new Date(d).toLocaleDateString() },
            { key: 'created_at', label: 'Generated', render: (d) => new Date(d).toLocaleDateString() },
          ]}
          data={reports}
          loading={loading}
          onRowClick={(row) => navigate(`/admin/reports/${row.report_id}`)}
        />
      </div>
    </div>
  )
}