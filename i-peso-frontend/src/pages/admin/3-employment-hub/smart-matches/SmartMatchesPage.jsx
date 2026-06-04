import { useState } from 'react'
import { PageHeader, StatCard, DataTable, ConfirmModal } from '@/pages/admin/_components'

export default function SmartMatchesPage() {
  const [matches, setMatches] = useState([
    {
      id: 1,
      run_date: '2024-06-01',
      job_seekers_matched: 145,
      positions_filled: 32,
      success_rate: '22.07%',
      status: 'completed',
    },
    {
      id: 2,
      run_date: '2024-05-15',
      job_seekers_matched: 128,
      positions_filled: 28,
      success_rate: '21.88%',
      status: 'completed',
    },
  ])

  const [isRunning, setIsRunning] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleRunMatching = () => {
    setIsRunning(true)
    // Simulate AI matching process
    setTimeout(() => {
      setMatches([
        {
          id: matches.length + 1,
          run_date: new Date().toISOString().split('T')[0],
          job_seekers_matched: Math.floor(Math.random() * 200),
          positions_filled: Math.floor(Math.random() * 50),
          success_rate: `${(Math.random() * 30).toFixed(2)}%`,
          status: 'completed',
        },
        ...matches,
      ])
      setIsRunning(false)
      setShowConfirm(false)
    }, 2000)
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
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          {value}
        </span>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        title="AI Smart Matches"
        subtitle="Run intelligent job seeker-to-vacancy matching and notify candidates"
      />

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          title="Total Matches"
          value={matches.length}
          icon="📊"
          trend="up"
        />
        <StatCard
          title="Positions Filled"
          value={matches.reduce((sum, m) => sum + m.positions_filled, 0)}
          icon="✓"
        />
        <StatCard
          title="Avg Success Rate"
          value={`${(matches.reduce((sum, m) => sum + parseFloat(m.success_rate), 0) / matches.length).toFixed(2)}%`}
          icon="📈"
        />
      </div>

      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Match History</h2>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isRunning ? 'Running...' : 'Run New Matching'}
          </button>
        </div>

        <DataTable columns={columns} data={matches} />
      </div>

      {showConfirm && (
        <ConfirmModal
          title="Run Smart Matching"
          message="This will analyze all job seekers and vacancies to find optimal matches. This may take a few minutes. Continue?"
          onConfirm={handleRunMatching}
          onCancel={() => setShowConfirm(false)}
          isLoading={isRunning}
        />
      )}
    </div>
  )
}
