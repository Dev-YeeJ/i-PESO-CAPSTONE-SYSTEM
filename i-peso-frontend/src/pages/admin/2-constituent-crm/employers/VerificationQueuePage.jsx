import { createElement, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, CheckCircle2, FileSearch, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, ErrorState, LoadingSkeleton } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import { adminService } from '@/services/adminService'

export default function VerificationQueuePage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'pendingEmployers'],
    queryFn: adminService.getPendingEmployers,
    staleTime: 30_000,
  })

  // Surface employers whose required documents are all approved first — those
  // are the ones an officer can act on immediately.
  const employers = useMemo(() => {
    const list = data?.employers ?? []
    return [...list].sort((a, b) => Number(b.all_required_approved) - Number(a.all_required_approved))
  }, [data])

  const readyCount = employers.filter((employer) => employer.all_required_approved).length
  const awaitingCount = employers.length - readyCount

  if (isLoading) {
    return (
      <div className="portal-page">
        <LoadingSkeleton variant="text" rows={2} className="max-w-md" />
        <LoadingSkeleton variant="card" rows={4} />
      </div>
    )
  }

  const errorMessage = error?.response?.data?.message ?? error?.response?.data?.error ?? 'Unable to load the employer verification queue.'

  return (
    <div className="portal-page">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <PageHeader
          eyebrow="Employer Accreditation"
          title="Verification Queue"
          subtitle="Review pending employer registrations and their required legal documents."
        />
        <Badge variant={employers.length ? 'pending' : 'verified'}>
          {employers.length} pending employer{employers.length === 1 ? '' : 's'}
        </Badge>
      </div>

      {isError ? (
        <Card><ErrorState description={errorMessage} onRetry={refetch} error={error} /></Card>
      ) : employers.length === 0 ? (
        <Card className="py-12 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-bold text-slate-950">Employer queue is clear</h2>
          <p className="mt-2 text-sm text-slate-500">No employer accreditation applications are waiting for review.</p>
        </Card>
      ) : (
        <>
          <p className="text-sm text-slate-600">
            <span className="font-bold text-slate-900">{readyCount}</span> ready for decision
            {' · '}
            <span className="font-bold text-slate-900">{awaitingCount}</span> awaiting documents
          </p>
          <div className="grid gap-5 lg:grid-cols-2">
            {employers.map((employer) => {
              const required = Number(employer.required_documents_count) || 0
              const approved = Number(employer.approved_required_documents_count) || 0
              const progress = required ? (approved / required) * 100 : 0
              return (
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
                          value={`${approved}/${required} approved`}
                          progress={progress}
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
                        Review employer and documents
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function QueueFact({ icon, label, value, progress }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      {createElement(icon, { className: 'h-4 w-4 text-brand-700' })}
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xs font-bold text-slate-700">{value}</p>
      {typeof progress === 'number' && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full rounded-full ${progress >= 100 ? 'bg-success' : 'bg-brand-navy'}`} style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}
    </div>
  )
}
