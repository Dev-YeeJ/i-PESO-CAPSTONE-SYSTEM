import { useState } from 'react'
import { Megaphone } from 'lucide-react'
import { Card, Button } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import DataTable from '@/pages/admin/_components/DataTable'

export default function AnnouncementsPage() {
  // Mock data removed. Awaiting backend integration for /admin/announcements
  const [announcements] = useState([])
  const [loading] = useState(false)

  const columns = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'content_preview', label: 'Preview', sortable: false },
    { key: 'published_date', label: 'Published Date', sortable: true },
    { key: 'views', label: 'Views', sortable: true },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
          value === 'published'
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-amber-100 text-amber-800'
        }`}>
          {value}
        </span>
      ),
    },
  ]

  return (
    <div className="portal-page">
      <PageHeader
        title="Portal Announcements"
        subtitle="Create and manage global announcements displayed to job seekers and employers."
        eyebrow="Content Management"
        actions={[
          { label: 'Create Announcement', onClick: () => alert('Create logic goes here'), variant: 'primary' }
        ]}
      />

      {announcements.length === 0 && !loading ? (
        <Card className="mt-6 text-center py-16">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <Megaphone className="h-10 w-10" />
          </div>
          <h2 className="mt-6 text-xl font-bold text-slate-950">No Announcements Found</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Keep your constituents informed. Publish news, updates, or alerts that will appear on their dashboards.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => alert('Create logic goes here')}>
            Draft First Announcement
          </Button>
        </Card>
      ) : (
        <Card padding="none" className="mt-6">
          <div className="p-5 sm:p-6 flex items-center justify-between border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Announcement Directory</h2>
              <p className="text-sm text-slate-500">Manage all portal communications.</p>
            </div>
          </div>
          <DataTable columns={columns} data={announcements} loading={loading} />
        </Card>
      )}
    </div>
  )
}
