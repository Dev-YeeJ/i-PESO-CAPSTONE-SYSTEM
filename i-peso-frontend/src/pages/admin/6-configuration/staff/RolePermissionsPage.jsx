import { useState } from 'react'
import { PageHeader } from '@/pages/admin/_components'

export default function RolePermissionsPage() {
  const [roles] = useState([
    {
      id: 1,
      name: 'Super Admin',
      description: 'Full system access',
      permissions: ['all'],
      users: 1,
    },
    {
      id: 2,
      name: 'CRM Manager',
      description: 'Manage job seekers and employers',
      permissions: [
        'view_job_seekers',
        'verify_profiles',
        'manage_employers',
        'export_data',
      ],
      users: 2,
    },
    {
      id: 3,
      name: 'Employment Specialist',
      description: 'Manage job postings and fairs',
      permissions: [
        'view_job_postings',
        'approve_vacancies',
        'manage_job_fairs',
        'view_analytics',
      ],
      users: 3,
    },
  ])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        title="Role & Permissions"
        subtitle="Define admin roles and their access permissions"
      />

      <div className="mt-8 grid grid-cols-1 gap-6">
        {roles.map((role) => (
          <div key={role.id} className="bg-white shadow rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                <p className="text-sm text-gray-600 mt-2">{role.users} staff member(s) assigned</p>
              </div>
              <button className="px-4 py-2 text-blue-600 hover:text-blue-900">
                Edit Permissions
              </button>
            </div>

            <div className="mt-4 border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Permissions:</h4>
              <div className="flex flex-wrap gap-2">
                {role.permissions.map((perm, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
                  >
                    {perm.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
