// i-peso-frontend/src/pages/admin/vacancies/VacanciesListPage.jsx
import { useEffect, useState } from 'react'
import PageHeader from '@/pages/admin/_components/PageHeader'
import DataTable from '@/pages/admin/_components/DataTable'
import StatusBadge from '@/pages/admin/_components/StatusBadge'

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