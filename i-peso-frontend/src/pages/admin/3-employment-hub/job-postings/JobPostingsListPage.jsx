import { BriefcaseBusiness } from 'lucide-react'
import { Card } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'

export default function JobPostingsListPage() {
  return (
    <div className="portal-page">
      <PageHeader
        title="Job Postings"
        subtitle="Monitor and oversee all active job vacancies posted by accredited employers."
        eyebrow="Employment Hub"
      />
      
      <Card className="mt-6 text-center py-16">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <BriefcaseBusiness className="h-10 w-10" />
        </div>
        <h2 className="mt-6 text-xl font-bold text-slate-950">Read-Only View</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          This portal currently provides a read-only overview of job vacancies. To manage or create vacancies, please log in through the respective employer constituent portal.
        </p>
      </Card>
    </div>
  )
}