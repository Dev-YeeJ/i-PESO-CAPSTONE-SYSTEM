import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone, X } from 'lucide-react'
import { announcementService } from '@/services/announcementService'
import AnnouncementDetailDialog from './AnnouncementDetailDialog'
import { priorityMeta } from './announcementMeta'

/**
 * Dashboard banner for job seekers and employers: live Important/Urgent
 * announcements this person hasn't dismissed (max 3, urgent first). Renders
 * nothing — and never blocks the dashboard — when there are none or the
 * request fails.
 */
export default function AnnouncementBanner({ className = 'mb-4 sm:mb-5' }) {
  const queryClient = useQueryClient()
  const [openId, setOpenId] = useState(null)
  const [hidden, setHidden] = useState(() => new Set())

  const bannerQuery = useQuery({
    queryKey: ['announcements', 'banner'],
    queryFn: announcementService.banner,
    staleTime: 60_000,
    retry: false,
  })

  const items = (bannerQuery.data?.data ?? []).filter((item) => !hidden.has(item.id))
  if (!items.length) {
    return openId ? <AnnouncementDetailDialog announcementId={openId} onClose={() => setOpenId(null)} /> : null
  }

  const dismiss = async (id) => {
    setHidden((current) => new Set(current).add(id))
    try {
      await announcementService.dismiss(id)
    } finally {
      queryClient.invalidateQueries({ queryKey: ['announcements', 'banner'] })
      queryClient.invalidateQueries({ queryKey: ['announcements', 'feed'] })
    }
  }

  return (
    <>
      <section aria-label="PESO announcements" className={`mx-auto max-w-[1440px] space-y-2 ${className}`}>
        {items.map((item) => {
          const meta = priorityMeta(item.priority)
          return (
            <div key={item.id} className={`relative flex items-start gap-3 overflow-hidden rounded-lg border p-4 pl-5 shadow-sm ${meta.banner}`}>
              <span className={`absolute inset-y-0 left-0 w-1.5 ${meta.bannerAccent}`} aria-hidden="true" />
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white ${meta.bannerText}`}>
                <Megaphone className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-[11px] font-black uppercase tracking-wider ${meta.bannerText}`}>
                  {item.priority === 'urgent' ? 'Urgent PESO announcement' : 'PESO announcement'}
                </p>
                <p className="mt-0.5 font-extrabold text-slate-950">{item.title}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-slate-700">{item.excerpt}</p>
                <button
                  type="button"
                  onClick={() => setOpenId(item.id)}
                  className={`mt-2 text-sm font-extrabold underline decoration-2 underline-offset-2 ${meta.bannerText}`}
                >
                  Read more
                </button>
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded-md p-1 text-slate-500 transition hover:bg-white hover:text-slate-900"
                aria-label={`Dismiss announcement: ${item.title}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </section>
      <AnnouncementDetailDialog announcementId={openId} onClose={() => setOpenId(null)} />
    </>
  )
}
