import { createElement, useEffect, useState } from 'react'
import { Building2, CheckCircle2, FileSearch, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import { adminService } from '@/services/adminService'

export default function VerificationQueuePage() {
  const [employers, setEmployers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    adminService.getPendingEmployers()
      .then((result) => setEmployers(result.employers ?? []))
      .catch((requestError) => setError(requestError.response?.data?.message ?? requestError.response?.data?.error ?? 'Unable to load employer verification queue.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="portal-page animate-pulse"><div className="h-24 rounded-2xl bg-slate-200" /><div className="grid gap-4 lg:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-48 rounded-2xl bg-slate-200" />)}</div></div>
  }

  return (
    <div className="portal-page">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <PageHeader
          eyebrow="Employer Accreditation"
          title="Verification Queue"
          subtitle="Review pending employer registrations and their required legal documents."
        />
        <Badge variant={employers.length ? 'pending' : 'verified'}>{employers.length} pending employer{employers.length === 1 ? '' : 's'}</Badge>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {employers.length === 0 ? (
        <Card className="py-12 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h2 className="mt-4 text-lg font-bold text-slate-950">Employer queue is clear</h2>
          <p className="mt-2 text-sm text-slate-500">No employer accreditation applications are waiting for review.</p>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {employers.map((employer) => (
            <Card key={employer.employer_id} interactive>
              <div className="flex items-start gap-4">
                <span className="rounded-2xl bg-brand-50 p-3 text-brand-700"><Building2 className="h-6 w-6" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="font-bold text-slate-950">{employer.company_name}</h2>
                      <p className="mt-1 truncate text-sm text-slate-500">{employer.email}</p>
                    </div>
                    <Badge variant={employer.all_required_approved ? 'reviewed' : 'pending'}>
                      {employer.all_required_approved ? 'Ready for decision' : 'Document review'}
                    </Badge>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <QueueFact
                      icon={FileSearch}
                      label="Required documents"
                      value={`${employer.approved_required_documents_count}/${employer.required_documents_count} approved`}
                    />
                    <QueueFact
                      icon={ShieldCheck}
                      label="Submitted"
                      value={new Date(employer.created_at).toLocaleDateString()}
                    />
                  </div>

                  <Button
                    onClick={() => navigate(`/admin/employers/${employer.employer_id}`)}
                    variant={employer.all_required_approved ? 'primary' : 'secondary'}
                    className="mt-5 w-full"
                  >
                    Review Employer and Documents
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function QueueFact({ icon, label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      {createElement(icon, { className: 'h-4 w-4 text-brand-700' })}
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xs font-bold text-slate-700">{value}</p>
    </div>
  )
}
