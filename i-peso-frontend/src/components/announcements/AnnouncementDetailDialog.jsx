import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, FileText, Loader2, Paperclip } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { announcementService } from '@/services/announcementService'
import { AnnouncementBody, AnnouncementLink, CategoryChip, PinnedMark, PriorityPill } from './AnnouncementPieces'
import { formatDateTime } from './announcementMeta'

/**
 * Full announcement for a signed-in reader. Fetching it is what marks it read
 * (GET /announcements/{id}), so the unread counters are refreshed afterwards.
 */
export default function AnnouncementDetailDialog({ announcementId, onClose }) {
  const queryClient = useQueryClient()
  const open = Boolean(announcementId)

  const detailQuery = useQuery({
    queryKey: ['announcements', 'detail', announcementId],
    queryFn: () => announcementService.get(announcementId),
    enabled: open,
    staleTime: 60_000,
  })
  const announcement = detailQuery.data?.announcement

  useEffect(() => {
    if (detailQuery.isSuccess) {
      queryClient.invalidateQueries({ queryKey: ['announcements', 'feed'] })
      queryClient.invalidateQueries({ queryKey: ['announcements', 'banner'] })
      queryClient.invalidateQueries({ queryKey: ['announcements', 'unread'] })
    }
  }, [detailQuery.isSuccess, queryClient])

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {detailQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading announcement…
          </div>
        ) : detailQuery.isError || !announcement ? (
          <>
            <DialogHeader>
              <DialogTitle>Announcement unavailable</DialogTitle>
              <DialogDescription>This announcement has ended or is no longer available.</DialogDescription>
            </DialogHeader>
          </>
        ) : (
          <>
            <DialogHeader className="pr-6">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryChip category={announcement.category} label={announcement.category_label} />
                <PriorityPill priority={announcement.priority} />
                {announcement.is_pinned && <PinnedMark />}
              </div>
              <DialogTitle className="pt-2 text-xl leading-tight">{announcement.title}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span>Posted by PESO Urdaneta · {formatDateTime(announcement.publish_at)}</span>
                {announcement.expires_at && (
                  <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Until {formatDateTime(announcement.expires_at)}</span>
                )}
              </DialogDescription>
            </DialogHeader>

            <AnnouncementBody text={announcement.body} />

            {announcement.has_attachment && (
              <ReaderAttachment announcement={announcement} />
            )}

            {announcement.link_url && (
              <div>
                <AnnouncementLink url={announcement.link_url} label={announcement.link_label} onNavigate={onClose} />
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Attachments stream through the API with the reader's token, so they're fetched as a blob. */
function ReaderAttachment({ announcement }) {
  const [url, setUrl] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl = null
    let cancelled = false
    announcementService.attachment(announcement.id)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => { if (!cancelled) setFailed(true) })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [announcement.id])

  if (failed) {
    return <p className="text-xs text-slate-500">The attachment could not be loaded.</p>
  }

  if (!url) {
    return <div className="h-24 animate-pulse rounded-xl bg-slate-100" aria-label="Loading attachment" />
  }

  if (announcement.attachment_is_image) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-slate-200">
        <img src={url} alt={announcement.attachment_name ?? 'Announcement attachment'} className="max-h-[420px] w-full object-contain bg-slate-50" />
      </a>
    )
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-800 transition hover:border-brand-navy">
      <FileText className="h-5 w-5 text-red-600" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{announcement.attachment_name ?? 'Attachment'}</span>
      <Paperclip className="h-4 w-4 text-slate-400" aria-hidden="true" />
      <span className="sr-only">Open attachment in a new tab</span>
    </a>
  )
}
