import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, ArrowRight, CheckCheck, Megaphone, Paperclip } from 'lucide-react'
import { Button, EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui'
import { announcementService } from '@/services/announcementService'
import AnnouncementDetailDialog from '@/components/announcements/AnnouncementDetailDialog'
import { CategoryChip, PinnedMark, PriorityPill } from '@/components/announcements/AnnouncementPieces'
import { CATEGORY_META, formatDateTime } from '@/components/announcements/announcementMeta'

/**
 * Every live PESO announcement for the signed-in job seeker or employer.
 * `?open={id}` opens one directly — the target of bell notifications.
 */
export default function AnnouncementsFeedPage({ role }) {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const openId = searchParams.get('open')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)

  const feedQuery = useQuery({
    queryKey: ['announcements', 'feed', category, page],
    queryFn: () => announcementService.list({ category, page }),
    placeholderData: (previous) => previous,
  })
  const items = feedQuery.data?.data ?? []
  const unread = feedQuery.data?.unread_count ?? 0
  const lastPage = feedQuery.data?.last_page ?? 1

  const readAll = useMutation({
    mutationFn: announcementService.readAll,
    onSuccess: () => {
      toast.success('All announcements marked as read.')
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
    },
    onError: () => toast.error('Unable to mark announcements as read.'),
  })

  const open = (id) => setSearchParams(id ? { open: String(id) } : {})
  const chooseCategory = (value) => { setCategory(value); setPage(1) }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-blue-700">PESO Urdaneta</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">Announcements</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Official notices from the Public Employment Service Office{role === 'employer' ? ' for employers' : ' for job seekers'} —
            office advisories, events, programs and system updates.
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" icon={CheckCheck} loading={readAll.isPending} onClick={() => readAll.mutate()}>
            Mark all as read ({unread})
          </Button>
        )}
      </header>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        <FilterButton active={category === ''} onClick={() => chooseCategory('')}>All</FilterButton>
        {Object.entries(CATEGORY_META).map(([value, meta]) => (
          <FilterButton key={value} active={category === value} onClick={() => chooseCategory(value)}>{meta.label}</FilterButton>
        ))}
      </div>

      <section className="mt-5">
        {feedQuery.isLoading ? (
          <LoadingSkeleton variant="card" rows={3} />
        ) : feedQuery.isError ? (
          <ErrorState title="Announcements could not be loaded" description="Check your connection and try again." onRetry={() => feedQuery.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            filtered={Boolean(category)}
            title={category ? 'No announcements in this category' : 'No announcements right now'}
            description="New notices from PESO will appear here."
          />
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => open(item.id)}
                  className={`group block w-full rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-brand-navy hover:shadow-md sm:p-5 ${
                    item.is_read ? 'border-slate-200' : 'border-blue-300 ring-1 ring-blue-100'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {!item.is_read && <span className="h-2 w-2 rounded-full bg-blue-600" aria-label="Unread" />}
                    <CategoryChip category={item.category} label={item.category_label} />
                    <PriorityPill priority={item.priority} />
                    {item.is_pinned && <PinnedMark />}
                    <span className="ml-auto text-xs text-slate-500">{formatDateTime(item.publish_at)}</span>
                  </div>
                  <h2 className={`mt-2 text-base text-slate-950 ${item.is_read ? 'font-bold' : 'font-black'}`}>{item.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{item.excerpt}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs font-bold text-brand-navy">
                    <span className="group-hover:underline">Read announcement</span>
                    {item.has_attachment && <span className="inline-flex items-center gap-1 text-slate-500"><Paperclip className="h-3.5 w-3.5" /> Attachment</span>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {lastPage > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" icon={ArrowLeft} disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
          <span className="px-2 text-xs font-extrabold text-slate-600">Page {page} of {lastPage}</span>
          <Button variant="outline" size="sm" icon={ArrowRight} disabled={page >= lastPage} onClick={() => setPage((current) => current + 1)}>Next</Button>
        </div>
      )}

      <AnnouncementDetailDialog announcementId={openId} onClose={() => open(null)} />
    </div>
  )
}

function FilterButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
        active ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-brand-navy hover:text-brand-navy'
      }`}
    >
      {children}
    </button>
  )
}
