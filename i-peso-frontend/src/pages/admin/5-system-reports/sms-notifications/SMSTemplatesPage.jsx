import { useState } from 'react'
import { PageHeader, DataTable } from '@/pages/admin/_components'

export default function SMSTemplatesPage() {
  const [templates, setTemplates] = useState([
    {
      id: 1,
      name: 'New Job Posting Alert',
      message: 'Hi! A new job matching your skills has been posted. Check it out: [link]',
      usage_count: 145,
      last_used: '2024-06-01',
    },
    {
      id: 2,
      name: 'Profile Verification Reminder',
      message: 'Your profile needs verification to unlock all features. Complete it here: [link]',
      usage_count: 89,
      last_used: '2024-05-28',
    },
    {
      id: 3,
      name: 'Job Fair Invitation',
      message: 'You are invited to attend our Job Fair on [date]. Register now: [link]',
      usage_count: 234,
      last_used: '2024-06-02',
    },
  ])

  const columns = [
    { key: 'name', label: 'Template Name', sortable: true },
    { key: 'message', label: 'Message Preview', sortable: false },
    { key: 'usage_count', label: 'Times Used', sortable: true },
    { key: 'last_used', label: 'Last Used', sortable: true },
    {
      key: 'actions',
      label: 'Actions',
      render: () => (
        <div className="flex gap-2">
          <button className="text-blue-600 hover:text-blue-900 text-sm">Edit</button>
          <button className="text-red-600 hover:text-red-900 text-sm">Delete</button>
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        title="SMS Templates"
        subtitle="Create and manage SMS message templates for broadcasts"
      />

      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Templates ({templates.length})</h2>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Create Template
          </button>
        </div>

        <DataTable columns={columns} data={templates} />
      </div>
    </div>
  )
}
