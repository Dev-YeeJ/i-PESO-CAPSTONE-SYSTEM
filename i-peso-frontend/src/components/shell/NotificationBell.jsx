import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CalendarHeart,
  CheckCheck,
  CircleCheck,
  Clock3,
  FileCheck2,
  Handshake,
  MailCheck,
  Megaphone,
  Search,
  TriangleAlert,
  UserPlus,
  XCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from '@/lib/toast'
import * as seekerService from '@/services/seekerService'
import * as employerService from '@/services/employerService'

const NAVY = 'bg-[#e8f0fc] text-brand-navy'

function announcementLook(data) {
  return { icon: Megaphone, classes: data?.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-[#fffbeb] text-[#b45309]' }
}

/**
 * Per-portal wiring. Each portal keeps its own API and React Query keys, so
 * anything that already invalidates e.g. ['employerNotifications', ...] still works.
 * The same `status` value means different things per portal (a seeker's
 * application "rejected" vs an employer's accreditation "rejected"), so each
 * portal has its own icon mapping.
 */
const PORTALS = {
  seeker: {
    key: 'seekerNotifications',
    service: seekerService,
    look(data) {
      if (data?.type === 'announcement') return announcementLook(data)
      if (data?.type === 'job_fair') return { icon: CalendarDays, classes: NAVY }
      if (data?.type === 'job_vacancy') return { icon: BriefcaseBusiness, classes: 'bg-emerald-50 text-emerald-700' }
      switch (data?.status) {
        case 'pending': return { icon: MailCheck, classes: NAVY }
        case 'reviewed': return { icon: Search, classes: NAVY }
        case 'shortlisted': return { icon: BriefcaseBusiness, classes: 'bg-[#fffbeb] text-[#b45309]' }
        case 'interview': return { icon: CalendarHeart, classes: 'bg-[#fffbeb] text-[#b45309]' }
        case 'hired': return { icon: Handshake, classes: 'bg-emerald-50 text-emerald-700' }
        case 'rejected': return { icon: XCircle, classes: 'bg-slate-100 text-slate-600' }
        default: return { icon: Clock3, classes: NAVY }
      }
    },
  },
  employer: {
    key: 'employerNotifications',
    service: employerService,
    look(data) {
      if (data?.type === 'announcement') return announcementLook(data)
      if (data?.type === 'application_received') return { icon: UserPlus, classes: NAVY }
      if (data?.status === 'verified') return { icon: CircleCheck, classes: 'bg-emerald-50 text-emerald-700' }
      if (data?.status === 'rejected' || data?.status === 'action_required') return { icon: TriangleAlert, classes: 'bg-red-100 text-red-700' }
      if (data?.event === 'document_approved') return { icon: FileCheck2, classes: 'bg-emerald-50 text-emerald-700' }
      return { icon: Clock3, classes: NAVY }
    },
  },
}

const formatWhen = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
}

/** The one notification bell shared by the seeker and employer portals. */
export default function NotificationBell({ portal = 'seeker' }) {
  const config = PORTALS[portal] ?? PORTALS.seeker
  const { key, service } = config
  const listKey = [key, 'list']
  const countKey = [key, 'unreadCount']

  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const notificationsQuery = useQuery({
    queryKey: listKey,
    queryFn: service.getNotifications,
    enabled: open,
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  })

  // refetchOnWindowFocus stays at the app-wide default (off): a focus refetch
  // fires the moment a native file picker closes, and its re-render was
  // swallowing upload <input> 'change' events elsewhere on the page. The 30s
  // poll keeps the badge fresh enough.
  const unreadQuery = useQuery({
    queryKey: countKey,
    queryFn: service.getNotificationUnreadCount,
    refetchInterval: 30000,
  })

  const notifications = notificationsQuery.data?.notifications ?? []
  const unreadCount = open && notificationsQuery.data
    ? notificationsQuery.data.unread_count ?? 0
    : unreadQuery.data?.unread_count ?? 0
  const loading = open && notificationsQuery.isFetching && !notificationsQuery.data

  useEffect(() => {
    if (notificationsQuery.isError) toast.error('Notifications could not be loaded. Try again in a moment.')
  }, [notificationsQuery.isError])

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false) }
    window.document.addEventListener('mousedown', closeOnOutsideClick)
    window.document.addEventListener('keydown', closeOnEscape)
    return () => {
      window.document.removeEventListener('mousedown', closeOnOutsideClick)
      window.document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const openNotification = async (notification) => {
    if (!notification.read_at) {
      queryClient.setQueryData(listKey, (current) => current ? ({
        ...current,
        notifications: (current.notifications ?? []).map((item) => (
          item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item
        )),
        unread_count: Math.max(0, (current.unread_count ?? 0) - 1),
      }) : current)
      queryClient.setQueryData(countKey, (current) => current ? ({
        ...current,
        unread_count: Math.max(0, (current.unread_count ?? 0) - 1),
      }) : current)

      try {
        await service.markNotificationRead(notification.id)
      } catch {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: listKey }),
          queryClient.invalidateQueries({ queryKey: countKey }),
        ])
        return
      }
    }

    setOpen(false)
    if (notification.data?.action_url) navigate(notification.data.action_url)
  }

  const markAllRead = async () => {
    const previousList = queryClient.getQueryData(listKey)
    const previousCount = queryClient.getQueryData(countKey)
    queryClient.setQueryData(listKey, (current) => current ? ({
      ...current,
      notifications: (current.notifications ?? []).map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })),
      unread_count: 0,
    }) : current)
    queryClient.setQueryData(countKey, (current) => current ? ({ ...current, unread_count: 0 }) : current)

    try {
      await service.markAllNotificationsRead()
    } catch {
      queryClient.setQueryData(listKey, previousList)
      queryClient.setQueryData(countKey, previousCount)
      toast.error('Notifications could not be marked as read.')
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-gold px-1 text-[10px] font-bold text-brand-navy ring-2 ring-white" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-elevated">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="font-semibold text-slate-900">Notifications</p>
              <p className="text-xs text-slate-500">{unreadCount} unread</p>
            </div>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="flex items-center gap-1 text-sm font-semibold text-brand-navy hover:underline">
                <CheckCheck className="h-4 w-4" aria-hidden="true" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="space-y-3 p-4" aria-busy="true">
                {[0, 1, 2].map((item) => <div key={item} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
                <p className="mt-2 text-sm text-slate-600">You&apos;re all caught up.</p>
                <p className="text-xs text-slate-500">Updates on your applications and announcements from PESO show here.</p>
              </div>
            )}
            {!loading && notifications.map((notification) => {
              const appearance = config.look(notification.data)
              const Icon = appearance.icon
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => openNotification(notification)}
                  className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 ${notification.read_at ? 'bg-white' : 'bg-[#e8f0fc]/60'}`}
                >
                  <span className={`mt-0.5 shrink-0 rounded-full p-2 ${appearance.classes}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">{notification.data?.title}</span>
                    <span className="mt-0.5 block text-sm leading-5 text-slate-600">{notification.data?.message}</span>
                    {notification.data?.interview_schedule && (
                      <span className="mt-1 block text-xs font-semibold text-brand-navy">{notification.data.interview_schedule}</span>
                    )}
                    {notification.data?.remarks && (
                      <span className="mt-1 block rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">{notification.data.remarks}</span>
                    )}
                    <span className="mt-1 block text-xs text-slate-500">{formatWhen(notification.created_at)}</span>
                  </span>
                  {!notification.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-navy" aria-label="Unread" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
