import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlertTriangle, Archive, ArrowLeft, BellRing, ChevronDown, Eye, FileText, Megaphone, Paperclip, RotateCcw, Save, Send, SlidersHorizontal, Trash2, Undo2 } from 'lucide-react'
import { Badge, Button, Card, ConfirmDialog, ErrorState, LoadingSkeleton } from '@/components/ui'
import { adminAnnouncementService, isoToLocalInput, localInputToIso } from '@/services/announcementService'
import { useAuthStore } from '@/stores/authStore'
import { canManage } from '@/utils/adminAccess'
import { AnnouncementBody, AnnouncementLink, CategoryChip, PinnedMark, PriorityPill } from '@/components/announcements/AnnouncementPieces'
import { AUDIENCE_SHORT, CATEGORY_META, PRIORITY_META, STATE_BADGE, formatDateTime, priorityMeta } from '@/components/announcements/announcementMeta'

const TITLE_MAX = 150
const BODY_MAX = 5000
const labelClass = 'text-xs font-extrabold uppercase tracking-wide text-slate-600'
const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/10 disabled:bg-slate-50 disabled:text-slate-500'

const EMPTY = {
  title: '',
  body: '',
  category: 'general',
  priority: 'normal',
  audience: 'all',
  is_pinned: false,
  notify_users: false,
  schedule: false,
  publish_at: '',
  has_expiry: false,
  expires_at: '',
  link_label: '',
  link_url: '',
  attachment: null,
  remove_attachment: false,
}

/** Fields that live under "More options". */
const EXTRA_FIELDS = ['category', 'is_pinned', 'expires_at', 'link_label', 'link_url', 'attachment']

const AUDIENCE_HELP = {
  public: 'Landing page + every job seeker and employer dashboard.',
  all: 'Every signed-in job seeker and employer.',
  seekers: 'Job seekers only (web and mobile app).',
  employers: 'Employers only, including those still being verified.',
}

const PRIORITY_HELP = {
  normal: 'Listed on the Announcements page only.',
  important: 'Also shown as an amber banner on dashboards.',
  urgent: 'Also shown as a red banner on dashboards, above everything else.',
}

export default function AnnouncementFormPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canEdit = canManage(user, 'configuration')

  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(null)
  const [confirm, setConfirm] = useState(null)
  // Optional settings stay folded away unless an announcement already uses them.
  const [showMore, setShowMore] = useState(false)

  const optionsQuery = useQuery({ queryKey: ['admin', 'announcementOptions'], queryFn: adminAnnouncementService.options, staleTime: 5 * 60_000 })
  const detailQuery = useQuery({
    queryKey: ['admin', 'announcement', id],
    queryFn: () => adminAnnouncementService.get(id),
    enabled: !isNew,
  })
  const announcement = detailQuery.data
  const state = announcement?.state ?? 'draft'
  const isPublished = announcement?.status === 'published'
  const readOnly = !canEdit || state === 'archived'

  useEffect(() => {
    if (!announcement) return
    setForm({
      ...EMPTY,
      title: announcement.title,
      body: announcement.body,
      category: announcement.category,
      priority: announcement.priority,
      audience: announcement.audience,
      is_pinned: announcement.is_pinned,
      notify_users: announcement.notify_users,
      schedule: Boolean(announcement.publish_at) && (announcement.status === 'published' || new Date(announcement.publish_at) > new Date()),
      publish_at: isoToLocalInput(announcement.publish_at),
      has_expiry: Boolean(announcement.expires_at),
      expires_at: isoToLocalInput(announcement.expires_at),
      link_label: announcement.link_label ?? '',
      link_url: announcement.link_url ?? '',
    })
    if (announcement.category !== 'general' || announcement.is_pinned || announcement.expires_at || announcement.link_url || announcement.has_attachment) {
      setShowMore(true)
    }
  }, [announcement])

  const audienceCounts = useMemo(
    () => Object.fromEntries((optionsQuery.data?.audiences ?? []).map((item) => [item.value, item.count])),
    [optionsQuery.data],
  )
  const audienceSize = audienceCounts[form.audience] ?? 0
  const alreadyNotified = Boolean(announcement?.notified_at)
  const scheduledFuture = form.schedule && form.publish_at && new Date(form.publish_at) > new Date()
  const extrasInUse = [
    form.category !== 'general',
    form.is_pinned,
    form.has_expiry,
    Boolean(form.link_url),
    Boolean(form.attachment) || (announcement?.has_attachment && !form.remove_attachment),
  ].filter(Boolean).length

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const payload = () => ({
    title: form.title,
    body: form.body,
    category: form.category,
    priority: form.priority,
    audience: form.audience,
    is_pinned: form.is_pinned,
    notify_users: form.notify_users,
    publish_at: (form.schedule || isPublished) && form.publish_at ? localInputToIso(form.publish_at) : '',
    expires_at: form.has_expiry && form.expires_at ? localInputToIso(form.expires_at) : '',
    link_label: form.link_url ? form.link_label : '',
    link_url: form.link_url,
    attachment: form.attachment,
    remove_attachment: form.remove_attachment,
  })

  const clientCheck = () => {
    const next = {}
    if (!form.title.trim()) next.title = 'Add a title.'
    if (!form.body.trim()) next.body = 'Write the announcement message.'
    if (form.schedule && !form.publish_at) next.publish_at = 'Pick when it should go live.'
    if (form.has_expiry && !form.expires_at) next.expires_at = 'Pick an end date or turn the end date off.'
    if (form.link_url && !form.link_label.trim()) next.link_label = 'Add a button label for the link.'
    setErrors(next)
    if (EXTRA_FIELDS.some((key) => next[key])) setShowMore(true)
    return Object.keys(next).length === 0
  }

  const handleError = (error, fallback) => {
    const fieldErrors = error.response?.data?.errors
    if (fieldErrors) {
      setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([key, messages]) => [key, messages[0]])))
      if (EXTRA_FIELDS.some((key) => fieldErrors[key])) setShowMore(true)
      toast.error('Please fix the highlighted fields.')
      return
    }
    toast.error(error.response?.data?.message ?? fallback)
  }

  const refresh = (saved) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] })
    if (saved) queryClient.setQueryData(['admin', 'announcement', String(saved.id)], saved)
  }

  /** intent: draft | save | publish */
  const save = async (intent) => {
    if (!clientCheck()) return
    setBusy(intent)
    try {
      const result = isNew
        ? await adminAnnouncementService.create(payload(), intent === 'publish' ? 'publish' : 'draft')
        : await adminAnnouncementService.update(id, payload(), intent === 'publish' ? 'publish' : 'save')
      toast.success(result.message)
      refresh(result.announcement)
      setForm((current) => ({ ...current, attachment: null, remove_attachment: false }))
      if (isNew) navigate(`/admin/announcements/${result.announcement.id}`, { replace: true })
    } catch (error) {
      handleError(error, 'Unable to save the announcement.')
    } finally {
      setBusy(null)
      setConfirm(null)
    }
  }

  const runAction = async (action) => {
    setBusy(action)
    try {
      if (action === 'delete') {
        await adminAnnouncementService.remove(id)
        toast.success('Draft deleted.')
        queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] })
        navigate('/admin/announcements', { replace: true })
        return
      }
      const result = await adminAnnouncementService.action(id, action)
      toast.success(result.message)
      refresh(result.announcement)
    } catch (error) {
      handleError(error, 'That action could not be completed.')
    } finally {
      setBusy(null)
      setConfirm(null)
    }
  }

  const askPublish = () => {
    if (!clientCheck()) return
    const audienceText = `${AUDIENCE_SHORT[form.audience]} (${audienceSize.toLocaleString()} ${audienceSize === 1 ? 'account' : 'accounts'}${form.audience === 'public' ? ' plus anyone visiting the landing page' : ''})`
    const notifyText = form.notify_users && !alreadyNotified
      ? ` Everyone in the audience will also get a bell notification${form.audience !== 'employers' ? ', and job seekers a push on the mobile app' : ''}. Sent notifications cannot be recalled.`
      : ''
    setConfirm({
      title: scheduledFuture ? 'Schedule this announcement?' : 'Publish this announcement now?',
      description: `${scheduledFuture ? `It will go live on ${formatDateTime(localInputToIso(form.publish_at))} for` : 'It will be visible right away to'} ${audienceText}.${notifyText}`,
      confirmLabel: scheduledFuture ? 'Schedule' : 'Publish now',
      variant: 'primary',
      onConfirm: () => save('publish'),
    })
  }

  if (!isNew && detailQuery.isLoading) {
    return <div className="portal-page"><LoadingSkeleton variant="card" rows={4} /></div>
  }
  if (!isNew && detailQuery.isError) {
    return (
      <div className="portal-page">
        <ErrorState title="Announcement not found" description="It may have been deleted." onRetry={() => detailQuery.refetch()} />
      </div>
    )
  }

  const err = (key) => errors[key] && <p className="mt-1 text-xs font-semibold text-red-600">{errors[key]}</p>

  return (
    <div className="portal-page">
      <button type="button" onClick={() => navigate('/admin/announcements')} className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back to announcements
      </button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="portal-eyebrow">Configuration · Announcements</p>
          <h1 className="portal-title mt-1">{isNew ? 'New announcement' : readOnly ? 'Announcement' : 'Edit announcement'}</h1>
          {!isNew && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <Badge status={STATE_BADGE[state] ?? 'neutral'}>{announcement.state_label}</Badge>
              {announcement.updated_by && <span>Last edited by {announcement.updated_by} · {formatDateTime(announcement.updated_at)}</span>}
            </div>
          )}
        </div>
      </div>

      {!canEdit && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">Your account can view announcements but not change them.</div>
      )}
      {canEdit && state === 'archived' && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">This announcement is archived. Restore it to a draft to edit or republish it.</div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* ── Form ── */}
        <div className="space-y-5">
          <Card>
            <div className="space-y-5">
              <label className="block">
                <span className={labelClass}>Title</span>
                <input value={form.title} onChange={(e) => set('title', e.target.value.slice(0, TITLE_MAX))} disabled={readOnly} className={inputClass} placeholder="e.g. PESO office closed on November 30 (Bonifacio Day)" />
                <span className="mt-1 flex justify-between text-xs text-slate-400"><span>{err('title')}</span>{form.title.length}/{TITLE_MAX}</span>
              </label>

              <label className="block">
                <span className={labelClass}>Message</span>
                <textarea value={form.body} onChange={(e) => set('body', e.target.value.slice(0, BODY_MAX))} disabled={readOnly} rows={6} className={inputClass} placeholder="Write the full announcement. Line breaks are kept." />
                <span className="mt-1 flex justify-between text-xs text-slate-400"><span>{err('body')}</span>{form.body.length.toLocaleString()}/{BODY_MAX.toLocaleString()}</span>
              </label>

              <Segmented
                label="Who sees it"
                value={form.audience}
                onChange={(value) => set('audience', value)}
                disabled={readOnly}
                options={Object.entries(AUDIENCE_SHORT).map(([value, label]) => ({ value, label }))}
                hint={`${AUDIENCE_HELP[form.audience]}${optionsQuery.data ? ` · ${audienceSize.toLocaleString()} accounts` : ''}`}
              />

              <Segmented
                label="Priority"
                value={form.priority}
                onChange={(value) => set('priority', value)}
                disabled={readOnly}
                options={Object.entries(PRIORITY_META).map(([value, meta]) => ({ value, label: meta.label }))}
                hint={PRIORITY_HELP[form.priority]}
              />

              {isPublished ? (
                <label className="block max-w-xs">
                  <span className={labelClass}>Visible from</span>
                  <input type="datetime-local" value={form.publish_at} onChange={(e) => set('publish_at', e.target.value)} disabled={readOnly} className={inputClass} />
                  {err('publish_at')}
                </label>
              ) : (
                <div>
                  <Segmented
                    label="When"
                    value={form.schedule ? 'later' : 'now'}
                    onChange={(value) => set('schedule', value === 'later')}
                    disabled={readOnly}
                    options={[{ value: 'now', label: 'Publish now' }, { value: 'later', label: 'Schedule' }]}
                  />
                  {form.schedule && (
                    <div className="mt-2 max-w-xs">
                      <input type="datetime-local" value={form.publish_at} onChange={(e) => set('publish_at', e.target.value)} disabled={readOnly} className={inputClass} aria-label="Publish date and time" />
                      {err('publish_at')}
                    </div>
                  )}
                </div>
              )}

              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <input
                  type="checkbox"
                  checked={form.notify_users}
                  onChange={(e) => set('notify_users', e.target.checked)}
                  disabled={readOnly || alreadyNotified}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm">
                  <span className="flex items-center gap-2 font-extrabold text-slate-950"><BellRing className="h-4 w-4 text-slate-400" /> Also notify the audience</span>
                  <span className="mt-0.5 block text-xs text-slate-600">
                    {alreadyNotified
                      ? `Sent to ${announcement.notified_count.toLocaleString()} users on ${formatDateTime(announcement.notified_at)} — notifications are only sent once.`
                      : `Bell notification${form.audience !== 'employers' ? ' + mobile push for job seekers' : ''}, sent once when it goes live.`}
                  </span>
                </span>
              </label>
            </div>

            {/* ── Optional settings, collapsed by default ── */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowMore((open) => !open)}
                aria-expanded={showMore}
                className="flex w-full items-center justify-between text-left text-sm font-extrabold text-slate-700 hover:text-brand-navy"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-slate-400" />
                  More options
                  <span className="text-xs font-semibold text-slate-400">
                    {extrasInUse > 0 ? `${extrasInUse} in use` : 'category, pin, end date, link, attachment'}
                  </span>
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
              </button>

              {showMore && (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className={labelClass}>Category</span>
                      <select value={form.category} onChange={(e) => set('category', e.target.value)} disabled={readOnly} className={inputClass}>
                        {Object.entries(CATEGORY_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
                      </select>
                    </label>
                    <div>
                      <span className={labelClass}>End date</span>
                      <label className="mt-2.5 flex items-center gap-2 text-sm text-slate-800">
                        <input type="checkbox" checked={form.has_expiry} onChange={(e) => set('has_expiry', e.target.checked)} disabled={readOnly} className="h-4 w-4 rounded border-slate-300" />
                        Hide it automatically after a date
                      </label>
                      {form.has_expiry && (
                        <>
                          <input type="datetime-local" value={form.expires_at} onChange={(e) => set('expires_at', e.target.value)} disabled={readOnly} className={inputClass} aria-label="End date and time" />
                          {err('expires_at')}
                        </>
                      )}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-slate-800">
                    <input type="checkbox" checked={form.is_pinned} onChange={(e) => set('is_pinned', e.target.checked)} disabled={readOnly} className="h-4 w-4 rounded border-slate-300" />
                    Pin to the top of every list
                  </label>

                  <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
                    <label className="block">
                      <span className={labelClass}>Link button label</span>
                      <input value={form.link_label} onChange={(e) => set('link_label', e.target.value.slice(0, 60))} disabled={readOnly} className={inputClass} placeholder="View job fairs" />
                      {err('link_label')}
                    </label>
                    <label className="block">
                      <span className={labelClass}>Link</span>
                      <input value={form.link_url} onChange={(e) => set('link_url', e.target.value)} disabled={readOnly} className={inputClass} placeholder="/seeker/job-fairs or https://…" />
                      {err('link_url')}
                    </label>
                  </div>

                  <div>
                    <span className={labelClass}>Attachment</span>
                    {announcement?.has_attachment && !form.remove_attachment && !form.attachment ? (
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                        <Paperclip className="h-4 w-4 text-slate-400" />
                        <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{announcement.attachment_name}</span>
                        <AdminAttachmentLink id={announcement.id} />
                        {!readOnly && <button type="button" onClick={() => set('remove_attachment', true)} className="text-xs font-bold text-red-600 hover:underline">Remove</button>}
                      </div>
                    ) : (
                      <div className="mt-1.5">
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,.pdf"
                          disabled={readOnly}
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null
                            if (file && file.size > 5 * 1024 * 1024) {
                              setErrors((current) => ({ ...current, attachment: 'The file must be 5 MB or smaller.' }))
                              e.target.value = ''
                              return
                            }
                            set('attachment', file)
                          }}
                          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-navy file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
                        />
                        <span className="mt-1 block text-xs text-slate-500">One image or PDF, up to 5 MB.</span>
                        {err('attachment')}
                        {form.remove_attachment && <button type="button" onClick={() => set('remove_attachment', false)} className="mt-1 text-xs font-bold text-brand-navy hover:underline">Keep the current attachment</button>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              {state === 'archived' ? (
                <Button variant="navy" icon={RotateCcw} loading={busy === 'restore'} onClick={() => runAction('restore')}>Restore as draft</Button>
              ) : (
                <>
                  {!isPublished && (
                    <Button icon={Send} loading={busy === 'publish'} disabled={Boolean(busy)} onClick={askPublish}>
                      {scheduledFuture ? 'Schedule' : 'Publish now'}
                    </Button>
                  )}
                  <Button variant={isPublished ? 'primary' : 'outline'} icon={Save} loading={busy === 'draft' || busy === 'save'} disabled={Boolean(busy)} onClick={() => save(isNew ? 'draft' : 'save')}>
                    {isNew ? 'Save as draft' : 'Save changes'}
                  </Button>
                  {isPublished && (
                    <Button
                      variant="outline"
                      icon={Undo2}
                      disabled={Boolean(busy)}
                      onClick={() => setConfirm({
                        title: 'Unpublish this announcement?',
                        description: 'It disappears for readers right away and goes back to drafts. Notifications already sent are not recalled.',
                        confirmLabel: 'Unpublish',
                        variant: 'danger',
                        onConfirm: () => runAction('unpublish'),
                      })}
                    >
                      Unpublish
                    </Button>
                  )}
                  {!isNew && (
                    <Button
                      variant="ghost"
                      icon={Archive}
                      disabled={Boolean(busy)}
                      onClick={() => setConfirm({
                        title: 'Archive this announcement?',
                        description: 'Readers will no longer see it. The record and its reach statistics are kept, and you can restore it later.',
                        confirmLabel: 'Archive',
                        variant: 'danger',
                        onConfirm: () => runAction('archive'),
                      })}
                    >
                      Archive
                    </Button>
                  )}
                </>
              )}
              {!isNew && announcement?.can_delete && (
                <Button
                  variant="ghost"
                  icon={Trash2}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={Boolean(busy)}
                  onClick={() => setConfirm({
                    title: 'Delete this draft?',
                    description: 'It was never published, so it can be removed permanently. This cannot be undone.',
                    confirmLabel: 'Delete draft',
                    variant: 'danger',
                    onConfirm: () => runAction('delete'),
                  })}
                >
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── Side panel ── */}
        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <Preview form={form} existing={announcement} />
          {!isNew && <StatusPanel announcement={announcement} />}
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => { if (!open && !busy) setConfirm(null) }}
        title={confirm?.title}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel}
        variant={confirm?.variant ?? 'danger'}
        busy={Boolean(busy)}
        onConfirm={confirm?.onConfirm}
      />
    </div>
  )
}

/** How readers will see it: the dashboard banner (Important/Urgent) and the list card. */
function Preview({ form, existing }) {
  const meta = priorityMeta(form.priority)
  const title = form.title.trim() || 'Your announcement title'
  const body = form.body.trim() || 'The announcement message will appear here.'
  const excerpt = body.replace(/\s+/g, ' ').slice(0, 180)
  const hasAttachment = Boolean(form.attachment) || (existing?.has_attachment && !form.remove_attachment)

  return (
    <Card padding="sm">
      <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-slate-500"><Eye className="h-4 w-4" /> Reader preview</h2>

      {form.priority !== 'normal' && (
        <div className="mt-3">
          <p className="text-[11px] font-bold text-slate-400">Dashboard banner</p>
          <div className={`relative mt-1 flex items-start gap-3 overflow-hidden rounded-lg border p-3 pl-4 ${meta.banner}`}>
            <span className={`absolute inset-y-0 left-0 w-1.5 ${meta.bannerAccent}`} aria-hidden="true" />
            <Megaphone className={`mt-0.5 h-4 w-4 shrink-0 ${meta.bannerText}`} aria-hidden="true" />
            <div className="min-w-0">
              <p className={`text-[10px] font-black uppercase tracking-wider ${meta.bannerText}`}>{form.priority === 'urgent' ? 'Urgent PESO announcement' : 'PESO announcement'}</p>
              <p className="text-sm font-extrabold text-slate-950">{title}</p>
              <p className="line-clamp-2 text-xs text-slate-700">{excerpt}</p>
            </div>
          </div>
        </div>
      )}

      <p className="mt-3 text-[11px] font-bold text-slate-400">Announcement</p>
      <div className="mt-1 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <CategoryChip category={form.category} />
          <PriorityPill priority={form.priority} />
          {form.is_pinned && <PinnedMark />}
        </div>
        <p className="mt-2 font-black text-slate-950">{title}</p>
        <AnnouncementBody text={body} className="mt-1 max-h-60 overflow-y-auto text-[13px]" />
        {hasAttachment && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <FileText className="h-3.5 w-3.5" /> {form.attachment?.name ?? existing?.attachment_name}
          </p>
        )}
        {form.link_url && (
          <div className="pointer-events-none mt-3">
            <AnnouncementLink url={form.link_url} label={form.link_label} />
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">Seen by: {AUDIENCE_SHORT[form.audience]}</p>
    </Card>
  )
}

function StatusPanel({ announcement }) {
  const reach = announcement.reach ?? {}
  const published = Boolean(announcement.first_published_at)

  return (
    <Card padding="sm">
      <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Status &amp; reach</h2>
      <dl className="mt-3 space-y-2 text-sm">
        <Row label="Status"><Badge status={STATE_BADGE[announcement.state] ?? 'neutral'}>{announcement.state_label}</Badge></Row>
        <Row label="Created">{announcement.created_by ?? '—'} · {formatDateTime(announcement.created_at)}</Row>
        {announcement.published_by && <Row label="Published by">{announcement.published_by}</Row>}
        <Row label="Visible from">{announcement.publish_at ? formatDateTime(announcement.publish_at) : '—'}</Row>
        <Row label="Until">{announcement.expires_at ? formatDateTime(announcement.expires_at) : 'No end date'}</Row>
        <Row label="Notifications">
          {announcement.notified_at
            ? `Sent to ${announcement.notified_count.toLocaleString()} · ${formatDateTime(announcement.notified_at)}`
            : announcement.notify_users ? (announcement.state === 'scheduled' ? 'Will send when it goes live' : 'Sending…') : 'Not requested'}
        </Row>
      </dl>

      {published ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Reach</p>
          <p className="mt-1 text-2xl font-black text-brand-navy">{reach.rate ?? 0}%</p>
          <p className="text-xs text-slate-600">Seen by {(reach.seen ?? 0).toLocaleString()} of {(reach.targeted ?? 0).toLocaleString()} accounts in the audience</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuenow={reach.rate ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label="Reach">
            <div className="h-full rounded-full bg-brand-navy" style={{ width: `${Math.max(reach.rate ?? 0, 2)}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">{(reach.seen_seekers ?? 0).toLocaleString()} job seekers · {(reach.seen_employers ?? 0).toLocaleString()} employers · {(reach.dismissed ?? 0).toLocaleString()} dismissed the banner</p>
        </div>
      ) : (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Not published yet — nobody outside PESO can see it.
        </p>
      )}
    </Card>
  )
}

/** One-click choice (radio group) — keeps the form short compared with dropdowns or cards. */
function Segmented({ label, value, options, onChange, disabled, hint }) {
  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div role="radiogroup" aria-label={label} className="mt-1.5 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {options.map((option) => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed ${
                selected ? 'bg-white text-brand-navy shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-right text-slate-800">{children}</dd>
    </div>
  )
}

function AdminAttachmentLink({ id }) {
  const [loading, setLoading] = useState(false)
  const open = async () => {
    setLoading(true)
    try {
      const blob = await adminAnnouncementService.attachment(id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener')
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      toast.error('Unable to open the attachment.')
    } finally {
      setLoading(false)
    }
  }
  return <button type="button" onClick={open} disabled={loading} className="text-xs font-bold text-brand-navy hover:underline">{loading ? 'Opening…' : 'View'}</button>
}
