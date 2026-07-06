import { MessageSquareText, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'

const templates = [
  ['Application status', 'Notifies a seeker when an application status changes.'],
  ['Interview scheduled', 'Provides the job, company, date, and time.'],
  ['Interview rescheduled', 'Confirms the revised interview date and time.'],
  ['Interview cancelled', 'Advises the seeker to check their account for details.'],
  ['Interview reminder', 'Reminds the seeker to prepare required documents.'],
  ['Employer verification', 'Confirms the employer account verification result.'],
]

export default function SMSTemplatesPage() {
  return <div className="portal-page"><PageHeader title="System SMS Templates" subtitle="Read-only templates used by verified i-PESO business workflows." eyebrow="System & Reports" /><Card><div className="flex items-start gap-3"><span className="rounded-xl bg-brand-50 p-2.5 text-brand-700"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="font-bold text-slate-950">Managed by the application</h2><p className="mt-1 text-sm leading-6 text-slate-600">Templates are limited to 160 characters and exclude passwords, documents, private links, and other sensitive data. Bulk broadcasts are not enabled.</p></div></div></Card><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{templates.map(([title, description]) => <Card key={title} padding="sm"><div className="flex items-start gap-3"><MessageSquareText className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" /><div><h3 className="font-bold text-slate-950">{title}</h3><p className="mt-1 text-sm leading-5 text-slate-600">{description}</p></div></div></Card>)}</div></div>
}
