import { useEffect, useState } from 'react'
import { FileText, FileBarChart, CalendarDays, CheckCircle2 } from 'lucide-react'
import { Card, Button } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import DataTable from '@/pages/admin/_components/DataTable'
import { adminService } from '@/services/adminService'

export default function DOLEReportingPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminService.getReports({ per_page: 15 }).then(d => {
      setReports(d.data || [])
      setLoading(false)
    }).catch(e => {
      console.error(e)
      setLoading(false)
    })
  }, [])

  const columns = [
    { key: 'month', label: 'Report Period', render: (val, row) => new Date(row.report_date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) },
    { key: 'total_jobseekers', label: 'Job Seekers' },
    { key: 'new_registrations', label: 'New Registrations' },
    { key: 'placements', label: 'Placements' },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
          value === 'submitted'
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-amber-100 text-amber-800'
        }`}>
          {value || 'Draft'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: () => (
        <button className="text-brand-600 hover:text-brand-900 text-sm font-bold">View Details</button>
      ),
    },
  ]

  return (
    <div className="portal-page">
      <PageHeader
        title="DOLE Reporting (SPRS)"
        subtitle="Generate Statistical Performance Reports and manage official DOLE submissions."
        eyebrow="Government & DOLE"
        actions={[
          { label: 'Generate New SPRS', onClick: () => alert('Generate report logic goes here'), variant: 'primary' }
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={FileText} label="Total Reports" value={reports.length} detail="Generated SPRS" tone="navy" />
        <SummaryCard icon={CalendarDays} label="Recent Submissions" value={reports.filter(r => r.status === 'submitted').length} detail="Officially filed" tone="green" />
        <SummaryCard icon={FileBarChart} label="Placements YTD" value={0} detail="Year to date" tone="blue" />
        <SummaryCard icon={CheckCircle2} label="Compliance" value="100%" detail="On-time submission rate" tone="amber" />
      </div>

      <Card padding="none" className="mt-6">
        <div className="p-5 sm:p-6 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-950">SPRS History</h2>
            <p className="text-sm text-slate-500">View and track past statistical reports.</p>
          </div>
        </div>
        
        <DataTable
          columns={columns}
          data={reports}
          loading={loading}
          emptyMessage="No reports found. Generate your first SPRS to begin tracking compliance."
        />
      </Card>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, detail, tone }) {
  const tones = {
    navy: 'bg-slate-100 text-brand-navy',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
  }

  return (
    <Card padding="sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <span className={`rounded-xl p-2.5 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  )
}

