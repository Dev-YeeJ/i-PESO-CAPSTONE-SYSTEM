// i-peso-frontend/src/pages/admin/reports/ReportsPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, PlusCircle } from 'lucide-react'
import { Card, Button } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import DataTable from '@/pages/admin/_components/DataTable'
import { adminService } from '@/services/adminService'

export default function LaborAnalyticsPage() {
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

  const columns = [
    { key: 'title', label: 'Report Title', sortable: true },
    { key: 'report_category', label: 'Category', render: (val) => <span className="capitalize text-slate-700 font-medium">{val}</span> },
    { key: 'coverage_start', label: 'Coverage Start', render: (d) => new Date(d).toLocaleDateString() },
    { key: 'created_at', label: 'Generated On', render: (d) => new Date(d).toLocaleDateString() },
    {
      key: 'actions',
      label: 'Actions',
      render: () => (
        <button className="text-brand-600 hover:text-brand-900 text-sm font-bold">View Report</button>
      ),
    },
  ]

  return (
    <div className="portal-page">
      <PageHeader
        title="Labor Analytics"
        subtitle="Generate and analyze custom reports on job placements, registrations, and vacancies."
        eyebrow="System & Reports"
      />

      <div className="grid gap-6 xl:grid-cols-3 mt-6">
        {/* Generate Form */}
        <div className="xl:col-span-1">
          <Card padding="none">
            <div className="p-5 border-b border-slate-100 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <PlusCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-950">New Report</h3>
                <p className="text-xs text-slate-500">Configure report parameters</p>
              </div>
            </div>
            <form onSubmit={handleGenerate} className="p-5 space-y-4 bg-slate-50/50">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Report Title</label>
                <input type="text" placeholder="e.g. Q3 2024 Placements" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Category</label>
                <select value={form.report_category} onChange={(e) => setForm({...form, report_category: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow">
                  <option value="placement">Placement</option>
                  <option value="registration">Registration</option>
                  <option value="vacancies">Vacancies</option>
                  <option value="programs">Programs</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Start Date</label>
                  <input type="date" value={form.coverage_start} onChange={(e) => setForm({...form, coverage_start: e.target.value})} required className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">End Date</label>
                  <input type="date" value={form.coverage_end} onChange={(e) => setForm({...form, coverage_end: e.target.value})} required className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow" />
                </div>
              </div>
              <Button type="submit" variant="primary" className="w-full mt-2" disabled={generating}>
                {generating ? 'Generating...' : 'Generate Report'}
              </Button>
            </form>
          </Card>
        </div>

        {/* Reports List */}
        <div className="xl:col-span-2">
          <Card padding="none" className="h-full">
            <div className="p-5 sm:p-6 flex items-center justify-between border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Saved Reports</h2>
                <p className="text-sm text-slate-500">Access previously generated analytics reports.</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <LineChart className="h-5 w-5" />
              </div>
            </div>
            <DataTable
              columns={columns}
              data={reports}
              loading={loading}
              onRowClick={(row) => navigate(`/admin/reports/${row.report_id}`)}
              emptyMessage="No reports have been generated yet."
            />
          </Card>
        </div>
      </div>
    </div>
  )
}