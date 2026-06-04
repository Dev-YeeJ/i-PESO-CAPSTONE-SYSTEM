// i-peso-frontend/src/pages/admin/employers/EmployersListPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/components/admin/PageHeader'
import DataTable from '@/components/admin/DataTable'
import { adminService } from '@/services/adminService'

export default function EmployersListPage() {
  const [employers, setEmployers] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    adminService.getEmployers({ per_page: 15 }).then(d => {
      setEmployers(d.data || [])
      setLoading(false)
    }).catch(e => {
      console.error(e)
      setLoading(false)
    })
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader title="Employers" subtitle="Manage registered employers" />
      <DataTable
        columns={[
          { key: 'company_name', label: 'Company' },
          { key: 'representative_name', label: 'Representative' },
          { key: 'email', label: 'Email' },
          { key: 'mobile_number', label: 'Mobile' },
        ]}
        data={employers}
        loading={loading}
        onRowClick={(row) => navigate(`/admin/employers/${row.employer_id}`)}
      />
    </div>
  )
}