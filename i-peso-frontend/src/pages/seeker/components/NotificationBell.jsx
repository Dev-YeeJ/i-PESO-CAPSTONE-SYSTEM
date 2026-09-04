import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Clock3, Search, CalendarHeart, XCircle, Handshake, MailCheck, BriefcaseBusiness, CalendarDays } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  getNotifications,
  getNotificationUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/seekerService'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const notificationsQuery = useQuery({
    queryKey: ['seekerNotifications', 'list'],
    queryFn: getNotifications,
    enabled: open,
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  })

  const unreadQuery = useQuery({
    queryKey: ['seekerNotifications', 'unreadCount'],
    queryFn: getNotificationUnreadCount,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  })

  const notifications = notificationsQuery.data?.notifications ?? []
  const unreadCount = open && notificationsQuery.data
    ? notificationsQuery.data.unread_count ?? 0
    : unreadQuery.data?.unread_count ?? 0
  const loading = open && notificationsQuery.isFetching

  useEffect(() => {
    if (notificationsQuery.isError) toast.error('Unable to load notifications.')
  }, [notificationsQuery.isError])

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    window.document.addEventListener('mousedown', closeOnOutsideClick)
    return () => window.document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  const openNotification = async (notification) => {
    if (!notification.read_at) {
      queryClient.setQueryData(['seekerNotifications', 'list'], (current) => current ? ({
        ...current,
        notifications: (current.notifications ?? []).map((item) => (
          item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item
        )),
        unread_count: Math.max(0, (current.unread_count ?? 0) - 1),
      }) : current)
      queryClient.setQueryData(['seekerNotifications', 'unreadCount'], (current) => current ? ({
        ...current,
        unread_count: Math.max(0, (current.unread_count ?? 0) - 1),
      }) : current)

      try {
        await markNotificationRead(notification.id)
      } catch {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['seekerNotifications', 'list'] }),
          queryClient.invalidateQueries({ queryKey: ['seekerNotifications', 'unreadCount'] }),
        ])
        return
      }
    }

    setOpen(false)
    if (notification.data?.action_url) navigate(notification.data.action_url)
  }

  const markAllRead = async () => {
    const previousList = queryClient.getQueryData(['seekerNotifications', 'list'])
    const previousCount = queryClient.getQueryData(['seekerNotifications', 'unreadCount'])
    queryClient.setQueryData(['seekerNotifications', 'list'], (current) => current ? ({
      ...current,
      notifications: (current.notifications ?? []).map((item) => ({
        ...item,
        read_at: item.read_at ?? new Date().toISOString(),
      })),
      unread_count: 0,
    }) : current)
    queryClient.setQueryData(['seekerNotifications', 'unreadCount'], (current) => current ? ({
      ...current,
      unread_count: 0,
    }) : current)

    try {
      await markAllNotificationsRead()
    } catch {
      queryClient.setQueryData(['seekerNotifications', 'list'], previousList)
      queryClient.setQueryData(['seekerNotifications', 'unreadCount'], previousCount)
      toast.error('Unable to mark notifications as read.')
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Open notifications"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="font-bold text-slate-900">Notifications</p>
              <p className="text-xs text-slate-500">{unreadCount} unread</p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && <p className="px-4 py-8 text-center text-sm text-slate-500">Loading notifications...</p>}
            {!loading && notifications.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No notifications yet.</p>
              </div>
            )}
            {notifications.map((notification) => {
              const appearance = notificationAppearance(notification.data)
              const Icon = appearance.icon

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => openNotification(notification)}
                  className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                    notification.read_at ? 'bg-white' : 'bg-blue-50/60'
                  }`}
                >
                  <span className={`mt-0.5 shrink-0 rounded-full p-2 ${appearance.classes}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">{notification.data?.title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-600">{notification.data?.message}</span>
                    {notification.data?.interview_schedule && (
                      <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wide text-indigo-700">{notification.data.interview_schedule}</span>
                    )}
                    <span className="mt-1 block text-[11px] font-medium text-slate-400">
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
                  </span>
                  {!notification.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function notificationAppearance(data) {
  if (data?.type === 'job_fair') {
    return { icon: CalendarDays, classes: 'bg-violet-100 text-violet-700' }
  }

  switch (data?.status) {
    case 'pending':
      return { icon: MailCheck, classes: 'bg-blue-100 text-blue-700' }
    case 'reviewed':
      return { icon: Search, classes: 'bg-purple-100 text-purple-700' }
    case 'shortlisted':
      return { icon: BriefcaseBusiness, classes: 'bg-yellow-100 text-yellow-700' }
    case 'interview':
      return { icon: CalendarHeart, classes: 'bg-indigo-100 text-indigo-700' }
    case 'hired':
      return { icon: Handshake, classes: 'bg-green-100 text-green-700' }
    case 'rejected':
      return { icon: XCircle, classes: 'bg-slate-100 text-slate-600' }
    default:
      return { icon: Clock3, classes: 'bg-blue-100 text-blue-700' }
  }
}
