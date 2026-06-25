import { createElement, useState } from 'react'
import { ShieldAlert, UsersRound } from 'lucide-react'
import { Card, Button } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import DataTable from '@/pages/admin/_components/DataTable'

export default function StaffListPage() {
  // Mock data removed. Awaiting backend integration for /admin/staff
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(false)

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
        <SummaryCard icon={UsersRound} label="Total Staff" value={staff.length} detail="Active staff accounts" tone="navy" />
        <SummaryCard icon={ShieldAlert} label="Pending Invites" value={0} detail="Waiting for activation" tone="amber" />
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
          emptyMessage="No staff members found. Add your first staff member to get started."
        />
      </Card>
    </div>
  )
}

function SummaryCard({ icon, label, value, detail, tone }) {
  const tones = {
    navy: 'bg-slate-100 text-brand-navy',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
  }

  return (
    <Card padding="sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{Number(value ?? 0).toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <span className={`rounded-xl p-2.5 ${tones[tone]}`}>
          {createElement(icon, { className: 'h-5 w-5' })}
        </span>
      </div>
    </Card>
  )
}
