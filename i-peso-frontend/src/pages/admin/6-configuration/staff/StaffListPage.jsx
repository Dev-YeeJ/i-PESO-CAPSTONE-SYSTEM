import { useState } from 'react'
import { PageHeader, DataTable } from '@/pages/admin/_components'

export default function StaffListPage() {
  const [staff, setStaff] = useState([
    {
      id: 1,
      name: 'Maria Cruz',
      email: 'maria.cruz@peso.gov.ph',
      role: 'Super Admin',
      status: 'active',
      department: 'Administration',
    },
    {
      id: 2,
      name: 'Juan Dela Cruz',
      email: 'juan.delacruz@peso.gov.ph',
      role: 'CRM Manager',
      status: 'active',
      department: 'Constituent Relations',
    },
    {
      id: 3,
      name: 'Ana Santos',
      email: 'ana.santos@peso.gov.ph',
      role: 'Employment Specialist',
      status: 'active',
      department: 'Employment Services',
    },
  ])

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: false },
    { key: 'role', label: 'Role', sortable: true },
    { key: 'department', label: 'Department', sortable: true },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          value === 'active'
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: () => (
        <div className="flex gap-2">
          <button className="text-blue-600 hover:text-blue-900 text-sm">Edit</button>
          <button className="text-red-600 hover:text-red-900 text-sm">Remove</button>
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        title="Staff Management"
        subtitle="Manage PESO admin staff and their roles"
      />

      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Staff Members ({staff.length})</h2>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Add Staff
          </button>
        </div>

        <DataTable columns={columns} data={staff} />
      </div>
    </div>
  )
}
