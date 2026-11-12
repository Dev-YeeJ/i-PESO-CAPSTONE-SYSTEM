import { useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowDown, ArrowUp, Bot, Eye, EyeOff, Home, Pencil, Plus, Search, Sparkles, Trash2 } from 'lucide-react'
import { Badge, Button, Card, ConfirmDialog, ErrorState, LoadingSkeleton } from '@/components/ui'
import { adminFaqService } from '@/services/siteContentService'
import { FAQ_AUDIENCES, FAQ_TOPICS } from '@/components/site-content/siteContentDefaults'
import FaqEditorSheet from './FaqEditorSheet'
import { ReadOnlyNote } from './SiteContentBits'
import { apiMessage, formatWhen } from './formStyles'

const selectClass = 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-navy focus:outline-none'

export default function FaqsTab({ canEdit, office }) {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ search: '', audience: '', status: '', topic: '' })
  const [editing, setEditing] = useState(null) // null closed, 'new', or a faq
  const [deleting, setDeleting] = useState(null)

  const query = useQuery({
    queryKey: ['admin-faqs', filters],
    queryFn: () => adminFaqService.list(filters),
    placeholderData: keepPreviousData,
  })
  const faqs = useMemo(() => query.data?.data ?? [], [query.data])
  const summary = query.data?.summary
  const filtering = Boolean(filters.search || filters.audience || filters.status)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-faqs'] })
    queryClient.invalidateQueries({ queryKey: ['site-content'] })
  }
  const run = (fn, fallback) => ({
    mutationFn: fn,
    onSuccess: (data) => { toast.success(data.message); refresh() },
    onError: (error) => toast.error(apiMessage(error, fallback)),
  })

  const toggle = useMutation(run(({ faq }) => (faq.is_published ? adminFaqService.unpublish(faq.id) : adminFaqService.publish(faq.id)), 'Could not change the FAQ.'))
  const feature = useMutation(run(({ faq }) => adminFaqService.feature(faq.id, !faq.is_featured), 'Could not change the landing page questions.'))
  const reorder = useMutation(run((ids) => adminFaqService.reorder(ids), 'Could not save the order.'))
  const starter = useMutation(run(() => adminFaqService.starterPack(), 'Could not add the suggested FAQs.'))
  const remove = useMutation({
    mutationFn: (faq) => adminFaqService.remove(faq.id),
    onSuccess: (data) => { toast.success(data.message); setDeleting(null); refresh() },
    onError: (error) => toast.error(apiMessage(error, 'Could not delete the FAQ.')),
  })

  const groups = useMemo(
    () => FAQ_TOPICS.map((topic) => ({ ...topic, items: faqs.filter((faq) => faq.topic === topic.value) })).filter((group) => group.items.length),
    [faqs],
  )

  const move = (group, index, delta) => {
    const ids = group.items.map((faq) => faq.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    reorder.mutate(ids)
  }

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">Frequently asked questions</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Shown on the public Help page, the job seeker and employer Help pages, and — once published — used by the assistant to answer questions.
            </p>
          </div>
          {canEdit && <Button variant="navy" icon={Plus} onClick={() => setEditing('new')}>New FAQ</Button>}
        </div>

        {summary && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{summary.published} published</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{summary.unpublished} unpublished</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-amber-800"><Home className="h-3 w-3" aria-hidden="true" /> {summary.featured}/{summary.max_featured} on the landing page</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-blue-800"><Bot className="h-3 w-3" aria-hidden="true" /> {summary.in_assistant}/{summary.assistant_limit} in the assistant</span>
          </div>
        )}

        {!canEdit && <div className="mt-4"><ReadOnlyNote>You can view FAQs but not change them.</ReadOnlyNote></div>}

        <div className="mt-4 flex flex-wrap gap-2">
          <label className="relative min-w-[14rem] flex-1">
            <span className="sr-only">Search FAQs</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input type="search" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Search questions and answers" className={`${selectClass} w-full pl-9`} />
          </label>
          <select value={filters.audience} onChange={(e) => setFilter('audience', e.target.value)} className={selectClass} aria-label="Filter by audience">
            <option value="">All audiences</option>
            {FAQ_AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          <select value={filters.topic} onChange={(e) => setFilter('topic', e.target.value)} className={selectClass} aria-label="Filter by topic">
            <option value="">All topics</option>
            {FAQ_TOPICS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={selectClass} aria-label="Filter by status">
            <option value="">Published and unpublished</option>
            <option value="published">Published</option>
            <option value="unpublished">Unpublished</option>
          </select>
        </div>
      </Card>

      {query.isLoading ? (
        <LoadingSkeleton variant="table" rows={5} />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : faqs.length === 0 ? (
        <Card className="text-center">
          {query.data?.can_add_starter_pack ? (
            <div className="py-6">
              <Sparkles className="mx-auto h-8 w-8 text-amber-500" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-black text-slate-950">No FAQs yet</h3>
              <p className="mx-auto mt-1 max-w-lg text-sm text-slate-600">
                Start from about a dozen suggested questions written from how i-PESO works — registration steps, employer documents,
                passwords, reports. They are added <strong>unpublished</strong> so you can check and adjust each one first.
              </p>
              {canEdit && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Button variant="navy" icon={Sparkles} loading={starter.isPending} onClick={() => starter.mutate()}>Add suggested FAQs</Button>
                  <Button variant="outline" icon={Plus} onClick={() => setEditing('new')}>Write my own</Button>
                </div>
              )}
            </div>
          ) : (
            <p className="py-6 text-sm text-slate-600">No FAQs match these filters.</p>
          )}
        </Card>
      ) : (
        groups.map((group) => (
          <Card key={group.value} padding="none">
            <h3 className="border-b border-slate-100 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">{group.label} · {group.items.length}</h3>
            <ul className="divide-y divide-slate-100">
              {group.items.map((faq, index) => (
                <li key={faq.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
                  {canEdit && !filtering && (
                    <div className="flex shrink-0 gap-1 sm:flex-col">
                      <button type="button" onClick={() => move(group, index, -1)} disabled={index === 0 || reorder.isPending} aria-label={`Move “${faq.question}” up`} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" onClick={() => move(group, index, 1)} disabled={index === group.items.length - 1 || reorder.isPending} aria-label={`Move “${faq.question}” down`} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => setEditing(faq)} className="text-left text-sm font-bold text-slate-950 hover:text-brand-navy">{faq.question}</button>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{faq.answer}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant={faq.is_published ? 'active' : 'draft'}>{faq.is_published ? 'Published' : 'Unpublished'}</Badge>
                      <Badge variant="neutral">{faq.audience_label}</Badge>
                      {faq.is_featured && <Badge variant="warning">On landing page</Badge>}
                      <span className="text-xs text-slate-400">Updated {formatWhen(faq.updated_at)}{faq.updated_by ? ` by ${faq.updated_by}` : ''}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {canEdit ? (
                      <>
                        <Button size="sm" variant={faq.is_published ? 'outline' : 'navy'} icon={faq.is_published ? EyeOff : Eye} loading={toggle.isPending && toggle.variables?.faq.id === faq.id} onClick={() => toggle.mutate({ faq })}>
                          {faq.is_published ? 'Unpublish' : 'Publish'}
                        </Button>
                        {faq.audience === 'everyone' && (
                          <Button size="sm" variant="ghost" icon={Home} loading={feature.isPending && feature.variables?.faq.id === faq.id} onClick={() => feature.mutate({ faq })} title="Show on the landing page (up to 5)">
                            {faq.is_featured ? 'Remove from home' : 'Show on home'}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(faq)}>Edit</Button>
                        <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setDeleting(faq)} aria-label={`Delete “${faq.question}”`} className="text-red-600 hover:bg-red-50 hover:text-red-700" />
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" icon={Eye} onClick={() => setEditing(faq)}>View</Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}

      <FaqEditorSheet open={editing !== null} onOpenChange={(open) => !open && setEditing(null)} faq={editing === 'new' ? null : editing} canEdit={canEdit} office={office} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this FAQ?"
        description={deleting ? `“${deleting.question}” will be removed from every Help page and the assistant. This can’t be undone — unpublish it instead if you may need it again.` : ''}
        confirmLabel="Delete FAQ"
        busy={remove.isPending}
        onConfirm={() => remove.mutate(deleting)}
      />
    </div>
  )
}
