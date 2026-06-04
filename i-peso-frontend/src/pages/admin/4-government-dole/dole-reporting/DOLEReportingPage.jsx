import { useState } from 'react'
import { PageHeader, ConfirmModal } from '@/pages/admin/_components'

export default function DOLEReportingPage() {
  const [reports, setReports] = useState([
    {
      id: 1,
      month: 'May 2024',
      total_jobseekers: 1250,
      new_registrations: 145,
      placements: 89,
      report_date: '2024-06-01',
      status: 'submitted',
    },
    {
      id: 2,
      month: 'April 2024',
      total_jobseekers: 1105,
      new_registrations: 132,
      placements: 76,
      report_date: '2024-05-01',
      status: 'submitted',
    },
  ])

  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState('')

  const handleGenerateSPRS = () => {
    if (!selectedMonth) return
    setReports([
      {
        id: reports.length + 1,
        month: selectedMonth,
        total_jobseekers: Math.floor(Math.random() * 1500),
        new_registrations: Math.floor(Math.random() * 200),
        placements: Math.floor(Math.random() * 150),
        report_date: new Date().toISOString().split('T')[0],
        status: 'draft',
      },
      ...reports,
    ])
    setShowConfirm(false)
    setSelectedMonth('')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        title="DOLE Reporting (SPRS)"
        subtitle="Generate Statistical Performance Report and manage DOLE submissions"
      />

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Job Seekers</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {reports[0]?.total_jobseekers || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">New Registrations</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {reports[0]?.new_registrations || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Placements</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {reports[0]?.placements || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Reports</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{reports.length}</p>
        </div>
      </div>

      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">SPRS History</h2>
          <button
            onClick={() => setShowConfirm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Generate New SPRS
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Month
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Seekers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  New Registrations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Placements
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {report.month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {report.total_jobseekers}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {report.new_registrations}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {report.placements}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      report.status === 'submitted'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-blue-600 hover:text-blue-900">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          title="Generate SPRS"
          message="Generate Statistical Performance Report?"
          onConfirm={handleGenerateSPRS}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  )
}
