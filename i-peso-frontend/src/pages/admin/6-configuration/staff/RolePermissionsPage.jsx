import { useState } from 'react'
import { ShieldCheck, ShieldAlert } from 'lucide-react'
import { Card, Button } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'

export default function RolePermissionsPage() {
  // Mock data removed. Awaiting backend integration for /admin/roles
  const [roles] = useState([])

  return (
    <div className="portal-page">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Define administrator roles and control their access to system features."
        eyebrow="Configuration"
        actions={[
          { label: 'Create Custom Role', onClick: () => alert('Create role logic goes here'), variant: 'primary' }
        ]}
      />

      <Card className="mt-6 text-center py-16">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h2 className="mt-6 text-xl font-bold text-slate-950">No Custom Roles Found</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Role-based access control is currently managing the default Administrator role. Create custom roles to delegate specific permissions to your staff.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => alert('Create role logic goes here')}>
          Create Custom Role
        </Button>
      </Card>
    </div>
  )
}
