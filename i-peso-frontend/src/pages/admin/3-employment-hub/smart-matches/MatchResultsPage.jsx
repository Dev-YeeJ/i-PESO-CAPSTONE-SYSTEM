import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { Card, Button } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import DataTable from '@/pages/admin/_components/DataTable'

export default function MatchResultsPage() {
  const { matchId } = useParams()

  // Mock data removed. Awaiting backend integration
  const [results] = useState([])
  const [loading] = useState(false)

  const columns = [
    { key: 'seeker_name', label: 'Seeker Name', sortable: true },
    { key: 'seeker_skills', label: 'Skills', sortable: false },
    { key: 'vacancy_title', label: 'Matched Position', sortable: true },
    { key: 'company', label: 'Company', sortable: true },
    { key: 'match_score', label: 'Match Score', sortable: true },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
          {value}
        </span>
      ),
    },
  ]

  return (
    <div className="portal-page">
      <PageHeader
        title={`Match Results #${matchId || '1'}`}
        subtitle="Detailed analysis of the Smart Match engine execution."
        eyebrow="Employment Hub"
      />

      {results.length === 0 && !loading ? (
        <Card className="mt-6 text-center py-16">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <SearchX className="h-10 w-10" />
          </div>
          <h2 className="mt-6 text-xl font-bold text-slate-950">No Results Found</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            There are no candidate matches available for this execution. Try running the match engine again.
          </p>
        </Card>
      ) : (
        <Card padding="none" className="mt-6">
          <div className="p-5 sm:p-6 flex items-center justify-between border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Matched Candidates</h2>
              <p className="text-sm text-slate-500">Candidates connected with job vacancies.</p>
            </div>
          </div>
          <DataTable columns={columns} data={results} loading={loading} />
        </Card>
      )}
    </div>
  )
}
