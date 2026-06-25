import { createElement, useState } from 'react'
import { BrainCircuit, PlayCircle, BarChart3, Users, CheckCircle2 } from 'lucide-react'
import { Card, Button } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import DataTable from '@/pages/admin/_components/DataTable'

export default function SmartMatchesPage() {
  // Mock data removed. Awaiting backend integration for AI matching
  const [matches] = useState([])
  const [loading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  const handleRunMatching = () => {
    setIsRunning(true)
    setTimeout(() => {
      alert('Backend AI matching logic not yet implemented.')
      setIsRunning(false)
    }, 1000)
  }

  const columns = [
    { key: 'run_date', label: 'Run Date', sortable: true },
    { key: 'job_seekers_matched', label: 'Seekers Matched', sortable: true },
    { key: 'positions_filled', label: 'Positions Filled', sortable: true },
    { key: 'success_rate', label: 'Success Rate', sortable: true },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
          {value}
        </span>
      ),
    },
  ]

  return (
    <div className="portal-page">
      <PageHeader
        title="AI Smart Matches"
        subtitle="Run intelligent job seeker-to-vacancy matching to accelerate local employment."
        eyebrow="Employment Hub"
        actions={[
          { label: isRunning ? 'Running...' : 'Run Match Engine', onClick: handleRunMatching, variant: 'primary', disabled: isRunning }
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard icon={BarChart3} label="Total Matches" value={matches.length} detail="Historical runs" tone="navy" />
        <SummaryCard icon={Users} label="Positions Filled" value={0} detail="Attributed to Smart Matches" tone="green" />
        <SummaryCard icon={CheckCircle2} label="Avg Success Rate" value="0%" detail="Candidate acceptance rate" tone="blue" />
      </div>

      <Card padding="none" className="mt-6">
        <div className="p-5 sm:p-6 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Match History</h2>
            <p className="text-sm text-slate-500">Review past AI matching executions and their outcomes.</p>
          </div>
        </div>

        {matches.length === 0 && !loading ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <BrainCircuit className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-950">No Matching History</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              You haven't run the Smart Match engine yet. Run it to start connecting job seekers with open vacancies automatically.
            </p>
            <Button variant="outline" className="mt-6" onClick={handleRunMatching} disabled={isRunning}>
              {isRunning ? 'Processing...' : 'Start Initial Match Run'}
            </Button>
          </div>
        ) : (
          <DataTable columns={columns} data={matches} loading={loading} />
        )}
      </Card>
    </div>
  )
}

function SummaryCard({ icon, label, value, detail, tone }) {
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
          {createElement(icon, { className: 'h-5 w-5' })}
        </span>
      </div>
    </Card>
  )
}

