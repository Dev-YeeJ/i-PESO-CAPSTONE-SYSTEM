import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCheck, ChevronDown, Megaphone, Paperclip } from 'lucide-react'
import { announcementService } from '@/services/announcementService'
import AnnouncementBanner from './AnnouncementBanner'
import AnnouncementDetailDialog from './AnnouncementDetailDialog'
import { CategoryChip, PinnedMark, PriorityPill } from './AnnouncementPieces'
import { formatDateTime } from './announcementMeta'

const FIRST_VISIBLE = 3
const MORE_STEP = 5

/**
 * PESO announcements on the job seeker and employer dashboards — where they
 * live now that there is no separate Announcements page (2026-11-14):
 *
 *  - urgent / important ones still show as dismissible banners on top;
 *  - every live announcement is listed in a compact card, newest first, with
 *    unread dots, "Mark all as read" and "Show more" for older ones;
 *  - `?announcement={id}` opens one directly — where bell notifications lead.
 */
export default function DashboardAnnouncements({ className = '' }) {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const openId = searchParams.get('announcement')
  const [visible, setVisible] = useState(FIRST_VISIBLE)

  const open = (id) => {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('announcement', String(id))
    else next.delete('announcement')
    setSearchParams(next, { replace: !id })
  }

  const feed = useInfiniteQuery({
    queryKey: ['announcements', 'feed', 'dashboard'],
    queryFn: ({ pageParam }) => announcementService.list({ page: pageParam, per_page: 10 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.current_page < last.last_page ? last.current_page + 1 : undefined),
    retry: false,
  })
  const items = feed.data?.pages.flatMap((page) => page.data ?? []) ?? []
  const unread = feed.data?.pages[0]?.unread_count ?? 0
  const shown = items.slice(0, visible)
  const canShowMore = visible < items.length || feed.hasNextPage

  const showMore = () => {
    const target = visible + MORE_STEP
    setVisible(target)
    if (target > items.length && feed.hasNextPage) feed.fetchNextPage()
  }

  const readAll = useMutation({
    mutationFn: announcementService.readAll,
    onSuccess: () => {
      toast.success('All announcements marked as read.')
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
    },
    onError: () => toast.error('Unable to mark announcements as read.'),
  })

  // Nothing published (or the feed is unreachable): stay out of the way, but
  // still honour a bell link to a specific announcement.
  const hasCard = feed.isSuccess && items.length > 0

  return (
    <div className={`mx-auto w-full max-w-[1440px] ${className}`}>
      <AnnouncementBanner className="mb-3" onOpen={open} />

      {hasCard && (
        <section aria-labelledby="dashboard-announcements-title" className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:mb-5 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="dashboard-announcements-title" className="flex items-center gap-2 text-base font-black text-slate-950">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-700"><Megaphone className="h-4 w-4" aria-hidden="true" /></span>
              PESO announcements
              {unread > 0 && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-extrabold text-white">{unread} new</span>}
            </h2>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => readAll.mutate()}
                disabled={readAll.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-brand-navy hover:bg-slate-100 disabled:opacity-60"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" /> Mark all as read
              </button>
            )}
          </div>

          <ul className="mt-3 divide-y divide-slate-100">
            {shown.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => open(item.id)} className="group flex w-full items-start gap-3 py-3 text-left">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.is_read ? 'bg-transparent' : 'bg-blue-600'}`} aria-label={item.is_read ? undefined : 'Unread'} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <CategoryChip category={item.category} label={item.category_label} />
                      <PriorityPill priority={item.priority} />
                      {item.is_pinned && <PinnedMark />}
                      <span className="ml-auto text-xs text-slate-500">{formatDateTime(item.publish_at)}</span>
                    </span>
                    <span className={`mt-1 block text-sm text-slate-950 group-hover:text-brand-navy ${item.is_read ? 'font-semibold' : 'font-black'}`}>{item.title}</span>
                    <span className="mt-0.5 line-clamp-1 block text-sm text-slate-600">{item.excerpt}</span>
                    {item.has_attachment && (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500"><Paperclip className="h-3 w-3" aria-hidden="true" /> Attachment</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {canShowMore && (
            <button
              type="button"
              onClick={showMore}
              disabled={feed.isFetchingNextPage}
              className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-brand-navy hover:underline disabled:opacity-60"
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
              {feed.isFetchingNextPage ? 'Loading…' : 'Show older announcements'}
            </button>
          )}
        </section>
      )}

      <AnnouncementDetailDialog announcementId={openId} onClose={() => open(null)} />
    </div>
  )
}
