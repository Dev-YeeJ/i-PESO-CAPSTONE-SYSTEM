import { useState } from 'react'
import { PageHeader } from '@/pages/admin/_components'

export default function PEISExportPage() {
  const [exports, setExports] = useState([
    {
      id: 1,
      export_date: '2024-06-01',
      records_exported: 1250,
      file_name: 'PEIS_2024_06_01.xlsx',
      status: 'completed',
      download_url: '#',
    },
    {
      id: 2,
      export_date: '2024-05-01',
      records_exported: 1105,
      file_name: 'PEIS_2024_05_01.xlsx',
      status: 'completed',
      download_url: '#',
    },
  ])

  const [isExporting, setIsExporting] = useState(false)

  const handleExportPEIS = () => {
    setIsExporting(true)
    setTimeout(() => {
      setExports([
        {
          id: exports.length + 1,
          export_date: new Date().toISOString().split('T')[0],
          records_exported: Math.floor(Math.random() * 1500),
          file_name: `PEIS_${new Date().toISOString().split('T')[0]}.xlsx`,
          status: 'completed',
          download_url: '#',
        },
        ...exports,
      ])
      setIsExporting(false)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        title="PEIS Data Export"
        subtitle="Export Philippines Employment Information System data"
      />

      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Export History</h2>
            <p className="text-sm text-gray-500 mt-1">
              PEIS exports are submitted to the Department of Labor and Employment
            </p>
          </div>
          <button
            onClick={handleExportPEIS}
            disabled={isExporting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isExporting ? 'Exporting...' : 'Export Now'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Export Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Records
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File Name
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
              {exports.map((exp) => (
                <tr key={exp.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {exp.export_date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {exp.records_exported.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {exp.file_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      {exp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <a href={exp.download_url} className="text-blue-600 hover:text-blue-900">
                      Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
