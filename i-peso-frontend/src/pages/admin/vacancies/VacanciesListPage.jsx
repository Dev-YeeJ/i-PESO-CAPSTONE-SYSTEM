// i-peso-frontend/src/pages/admin/vacancies/VacanciesListPage.jsx
import { useEffect, useState } from 'react'
import PageHeader from '@/components/admin/PageHeader'
import DataTable from '@/components/admin/DataTable'
import StatusBadge from '@/components/admin/StatusBadge'

export default function VacanciesListPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Vacancies"
        subtitle="View all job openings from employers"
      />
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <p className="text-blue-900">This is a read-only view of job vacancies. To manage vacancies, please use the employer portal.</p>
      </div>
    </div>
  )
}