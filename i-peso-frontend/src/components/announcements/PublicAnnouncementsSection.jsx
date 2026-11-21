import { useEffect, useState } from 'react'
import { CalendarClock, FileText, Megaphone } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { publicAnnouncementService } from '@/services/announcementService'
import { AnnouncementBody, AnnouncementLink, CategoryChip, PriorityPill } from './AnnouncementPieces'
import { formatDate, formatDateTime, isInternalLink } from './announcementMeta'

/**
 * Landing page: live announcements PESO addressed to the Public audience.
 * Renders nothing at all when there are none (or the request fails), so the
 * page never shows an empty "announcements" block.
 */
export default function PublicAnnouncementsSection() {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(null)

  useEffect(() => {
    let cancelled = false
    publicAnnouncementService.list(3)
      .then((data) => { if (!cancelled) setItems(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!items.length) return null

  return (
    <section id="announcements" className="relative z-10 border-t border-white/5 bg-[#0D1F38] px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/15 text-yellow-400">
            <Megaphone className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">PESO Announcements</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-white md:text-3xl">Latest from the PESO office</h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setOpen(item)}
              className={`flex flex-col rounded-xl border bg-white p-5 text-left text-[#0A192F] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl ${
                item.priority === 'urgent' ? 'border-red-400 ring-2 ring-red-400/40' : 'border-white/10'
              }`}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <CategoryChip category={item.category} label={item.category_label} />
                <PriorityPill priority={item.priority} />
              </div>
              <h3 className="mt-3 text-base font-extrabold leading-snug">{item.title}</h3>
              <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">{item.excerpt}</p>
              <p className="mt-3 text-xs font-semibold text-slate-500">{formatDate(item.publish_at)} · <span className="text-[#B45309]">Read more</span></p>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={Boolean(open)} onOpenChange={(next) => { if (!next) setOpen(null) }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {open && (
            <>
              <DialogHeader className="pr-6">
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryChip category={open.category} label={open.category_label} />
                  <PriorityPill priority={open.priority} />
                </div>
                <DialogTitle className="pt-2 text-xl leading-tight">{open.title}</DialogTitle>
                <DialogDescription className="flex flex-wrap gap-x-3 text-xs">
                  <span>PESO Urdaneta · {formatDateTime(open.publish_at)}</span>
                  {open.expires_at && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Until {formatDateTime(open.expires_at)}</span>}
                </DialogDescription>
              </DialogHeader>
              <AnnouncementBody text={open.body} />
              {open.has_attachment && (
                open.attachment_is_image ? (
                  <a href={publicAnnouncementService.attachmentUrl(open.id)} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-slate-200">
                    <img src={publicAnnouncementService.attachmentUrl(open.id)} alt={open.attachment_name ?? 'Announcement attachment'} className="max-h-[420px] w-full bg-slate-50 object-contain" />
                  </a>
                ) : (
                  <a href={publicAnnouncementService.attachmentUrl(open.id)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-800 hover:border-brand-navy">
                    <FileText className="h-5 w-5 text-red-600" aria-hidden="true" /> {open.attachment_name ?? 'Attachment'}
                  </a>
                )
              )}
              {/* Internal links usually point inside the signed-in portal — visitors get there through sign-in. */}
              {open.link_url && (
                <div>
                  <AnnouncementLink url={open.link_url} label={open.link_label} onNavigate={() => setOpen(null)} />
                  {isInternalLink(open.link_url) && <p className="mt-2 text-xs text-slate-500">You may be asked to sign in first.</p>}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
