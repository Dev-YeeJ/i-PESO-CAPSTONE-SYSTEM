import { useState } from 'react'
import { PageHeader, DataTable } from '@/pages/admin/_components'

export default function ContentModuleListPage() {
  const [modules, setModules] = useState([
    {
      id: 1,
      name: 'Landing Page Hero',
      type: 'Banner',
      status: 'active',
      last_updated: '2024-06-01',
      updated_by: 'Maria Cruz',
    },
    {
      id: 2,
      name: 'How It Works Guide',
      type: 'Page Content',
      status: 'active',
      last_updated: '2024-05-15',
      updated_by: 'Juan Dela Cruz',
    },
    {
      id: 3,
      name: 'FAQ Section',
      type: 'Knowledge Base',
      status: 'active',
      last_updated: '2024-05-20',
      updated_by: 'Ana Santos',
    },
  ])

  const columns = [
    { key: 'name', label: 'Module Name', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'updated_by', label: 'Last Updated By', sortable: true },
    { key: 'last_updated', label: 'Date', sortable: true },
    {
      key: 'actions',
      label: 'Actions',
      render: () => (
        <div className="flex gap-2">
          <button className="text-blue-600 hover:text-blue-900 text-sm">Edit</button>
          <button className="text-gray-600 hover:text-gray-900 text-sm">Preview</button>
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        title="Content Modules"
        subtitle="Manage portal content and static pages"
      />

      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Modules</h2>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Add Module
          </button>
        </div>

        <DataTable columns={columns} data={modules} />
      </div>
    </div>
  )
}
