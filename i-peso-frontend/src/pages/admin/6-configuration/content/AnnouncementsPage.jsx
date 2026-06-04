import { useState } from 'react'
import { PageHeader, DataTable } from '@/pages/admin/_components'

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([
    {
      id: 1,
      title: 'New Job Fair Schedule Released',
      content_preview: 'The Q3 2024 job fair schedule is now available...',
      published_date: '2024-06-01',
      status: 'published',
      views: 1250,
    },
    {
      id: 2,
      title: 'System Maintenance Notice',
      content_preview: 'The portal will undergo maintenance on June 5...',
      published_date: '2024-05-28',
      status: 'published',
      views: 890,
    },
    {
      id: 3,
      title: 'New Features Coming Soon',
      content_preview: 'Smart matching and SMS features launching next week...',
      published_date: '2024-05-20',
      status: 'draft',
      views: 0,
    },
  ])

  const columns = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'content_preview', label: 'Preview', sortable: false },
    { key: 'published_date', label: 'Published Date', sortable: true },
    { key: 'views', label: 'Views', sortable: true },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          value === 'published'
            ? 'bg-green-100 text-green-800'
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {value}
        </span>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        title="Portal Announcements"
        subtitle="Create and manage announcements displayed on the portal"
      />

      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Announcements</h2>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Create Announcement
          </button>
        </div>

        <DataTable columns={columns} data={announcements} />
      </div>
    </div>
  )
}
