import { Navigate, useSearchParams } from 'react-router-dom'

/**
 * The old /seeker/announcements and /employer/announcements pages were
 * removed (announcements now live on the dashboard and in the bell). Bell
 * notifications sent before that link to `…/announcements?open={id}`, so the
 * redirect carries the id across and the dashboard opens that announcement.
 */
export default function AnnouncementsRedirect({ to }) {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('open')

  return <Navigate to={id ? `${to}?announcement=${encodeURIComponent(id)}` : to} replace />
}
