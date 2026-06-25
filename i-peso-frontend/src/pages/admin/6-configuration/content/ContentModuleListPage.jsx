import { useState } from 'react'
import { LayoutTemplate } from 'lucide-react'
import { Card, Button } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import DataTable from '@/pages/admin/_components/DataTable'

export default function ContentModuleListPage() {
  // Mock data removed. Awaiting backend integration for /admin/content-modules
  const [modules] = useState([])
  const [loading] = useState(false)

  const columns = [
    { key: 'name', label: 'Module Name', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
          value === 'active'
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-slate-100 text-slate-800'
        }`}>
          {value}
        </span>
      ),
    },
    { key: 'updated_by', label: 'Last Updated By', sortable: true },
    { key: 'last_updated', label: 'Date', sortable: true },
    {
      key: 'actions',
      label: 'Actions',
      render: () => (
        <div className="flex gap-3">
          <button className="text-brand-600 hover:text-brand-900 text-sm font-bold">Edit</button>
          <button className="text-slate-600 hover:text-slate-900 text-sm font-bold">Preview</button>
        </div>
      ),
    },
  ]

  return (
    <div className="portal-page">
      <PageHeader
        title="Content Modules"
        subtitle="Manage dynamic content components and landing page configurations."
        eyebrow="Content Management"
        actions={[
          { label: 'Create Module', onClick: () => alert('Create logic goes here'), variant: 'primary' }
        ]}
      />

      {modules.length === 0 && !loading ? (
        <Card className="mt-6 text-center py-16">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <LayoutTemplate className="h-10 w-10" />
          </div>
          <h2 className="mt-6 text-xl font-bold text-slate-950">No Content Modules Configured</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            The platform is using default static content. Add content modules to override the landing page, FAQs, or help guides.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => alert('Create logic goes here')}>
            Create Content Module
          </Button>
        </Card>
      ) : (
        <Card padding="none" className="mt-6">
          <div className="p-5 sm:p-6 flex items-center justify-between border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Module Directory</h2>
              <p className="text-sm text-slate-500">Active blocks currently rendered on the user portal.</p>
            </div>
          </div>
          <DataTable columns={columns} data={modules} loading={loading} />
        </Card>
      )}
    </div>
  )
}
