import { useState } from 'react'
import { ShieldAlert, UsersRound } from 'lucide-react'
import { Card } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import StatCard from '@/pages/admin/_components/StatCard'
import DataTable from '@/pages/admin/_components/DataTable'

export default function StaffListPage() {
  // Mock data removed. Awaiting backend integration for /admin/staff
  const [staff] = useState([])
  const [loading] = useState(false)

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: false },
    { key: 'role', label: 'Role', sortable: true },
    { key: 'department', label: 'Department', sortable: true },
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
    {
      key: 'actions',
      label: 'Actions',
      render: () => (
        <div className="flex gap-3">
          <button className="text-brand-600 hover:text-brand-900 text-sm font-bold">Edit</button>
          <button className="text-red-600 hover:text-red-900 text-sm font-bold">Remove</button>
        </div>
      ),
    },
  ]

  return (
    <div className="portal-page">
      <PageHeader
        title="Staff Management"
        subtitle="Manage PESO admin staff and their system access."
        eyebrow="Configuration"
        actions={[
          { label: 'Add Staff Member', onClick: () => alert('Add staff logic goes here'), variant: 'primary' }
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={UsersRound} color="blue" label="Total Staff" value={staff.length.toLocaleString()} subtitle="Active staff accounts" hint="PESO administrator accounts with system access." />
        <StatCard icon={ShieldAlert} color="amber" label="Pending Invites" value="0" subtitle="Waiting for activation" hint="Invited staff who have not activated their account yet." />
      </div>

      <Card padding="none" className="mt-6">
        <div className="p-5 sm:p-6 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Staff Directory</h2>
            <p className="text-sm text-slate-500">View and manage administrator accounts.</p>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={staff}
          loading={loading}
          caption="PESO staff directory."
          emptyTitle="No staff members yet"
          emptyDescription="Add your first staff member to get started."
        />
      </Card>
    </div>
  )
}
