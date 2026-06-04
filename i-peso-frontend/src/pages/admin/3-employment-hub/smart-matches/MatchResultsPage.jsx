import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { PageHeader, DataTable } from '@/pages/admin/_components'

export default function MatchResultsPage() {
  const { matchId } = useParams()

  const [results] = useState([
    {
      id: 1,
      seeker_name: 'John Doe',
      seeker_skills: 'Python, React, Node.js',
      vacancy_title: 'Full Stack Developer',
      company: 'Tech Corp',
      match_score: '92%',
      status: 'notified',
    },
    {
      id: 2,
      seeker_name: 'Jane Smith',
      seeker_skills: 'Accounting, Excel, SAP',
      vacancy_title: 'Accountant',
      company: 'Finance Ltd',
      match_score: '88%',
      status: 'notified',
    },
    {
      id: 3,
      seeker_name: 'Miguel Santos',
      seeker_skills: 'Sales, Customer Service',
      vacancy_title: 'Sales Executive',
      company: 'Retail Plus',
      match_score: '85%',
      status: 'notified',
    },
  ])

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
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {value}
        </span>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        title="Match Results"
        subtitle={`Results from matching run #${matchId || '1'}`}
      />

      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Matched Candidates ({results.length})
        </h2>
        <DataTable columns={columns} data={results} />
      </div>
    </div>
  )
}
