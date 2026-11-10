import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Lock } from 'lucide-react'
import { Badge, Button, Card, CardHeader } from '@/components/ui'
import { reviewModerationService } from '@/services/reviewModerationService'
import { useAuthStore } from '@/stores/authStore'
import { canManage } from '@/utils/adminAccess'

/**
 * Employers' private feedback about this job seeker (Verified Mutual Feedback
 * System). Only PESO and the worker can see it; staff can hide feedback
 * that's discriminatory or not about the job.
 */
export default function WorkerFeedbackCard({ seekerId }) {
  const user = useAuthStore((s) => s.user)
  const canAct = canManage(user, 'constituent_crm')
  const queryClient = useQueryClient()
  const [hiding, setHiding] = useState(null)
  const [note, setNote] = useState('')

  const key = ['admin', 'seeker', seekerId, 'worker-feedback']
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => reviewModerationService.seekerWorkerFeedback(seekerId), enabled: !!seekerId })
  const feedback = data?.feedback ?? []

  const visibility = useMutation({
    mutationFn: ({ id, visible }) => reviewModerationService.setWorkerFeedbackVisible(id, visible, note),
    onSuccess: (res) => { toast.success(res.message); setHiding(null); setNote(''); queryClient.invalidateQueries({ queryKey: key }) },
    onError: (err) => toast.error(err?.response?.data?.errors?.note?.[0] ?? err?.response?.data?.message ?? 'That did not go through.'),
  })

  return (
    <Card>
      <CardHeader title="Feedback from employers" subtitle="Private. Only PESO and this job seeker can see it; never other employers." />
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : feedback.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-slate-500"><Lock className="h-4 w-4" /> No employer feedback yet.</p>
      ) : (
        <ul className="space-y-3">
          {feedback.map((item) => (
            <li key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-slate-900">{item.employer}{item.job_title ? <span className="font-normal text-slate-500"> · {item.job_title}</span> : null}</p>
                {item.status === 'hidden' ? <Badge variant="rejected" icon={false}>Hidden</Badge> : <span className="text-xs text-slate-600">Would rehire: <strong>{item.would_rehire}</strong></span>}
              </div>
              <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                {item.ratings.map((rating) => <li key={rating.key}>{rating.label}: <strong className="text-slate-800">{rating.value}</strong>/5</li>)}
              </ul>
              {item.comment && <p className="mt-1.5 text-slate-700">{item.comment}</p>}
              {item.status === 'hidden' && item.moderation_note && <p className="mt-1 text-xs text-red-700">Hidden by PESO: {item.moderation_note}</p>}

              {canAct && (hiding === item.id ? (
                <div className="mt-2 space-y-2">
                  <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Why it's being hidden (e.g. not job-related)"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/20" aria-label="Reason for hiding" />
                  <div className="flex gap-2">
                    <Button size="sm" variant="danger" loading={visibility.isPending} onClick={() => visibility.mutate({ id: item.id, visible: false })}>Hide feedback</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setHiding(null); setNote('') }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  {item.status === 'hidden'
                    ? <Button size="sm" variant="outline" loading={visibility.isPending} onClick={() => visibility.mutate({ id: item.id, visible: true })}>Restore</Button>
                    : <Button size="sm" variant="ghost" onClick={() => setHiding(item.id)}>Hide</Button>}
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
