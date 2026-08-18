import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { connectGoogleCalendar, updateEmployerApplicationStatusBulk } from '@/services/employerApplicationService'

const STATUS_LABELS = {
  reviewed: 'Reviewed',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  hired: 'Hired',
  rejected: 'Rejected',
}

/**
 * Runs a (single or bulk) application status change against the shared
 * bulk-update endpoint and reports back what the server actually did —
 * not just what was requested, since already-terminal applications are
 * silently skipped server-side rather than erroring.
 */
export default function useApplicationStatusActions({ invalidateKeys = [] } = {}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()

  const runStatusChange = async (targetStatus, targets, extraPayload = {}) => {
    if (!targets.length) return { success: false, processed: 0 }

    setIsSubmitting(true)
    try {
      const payload = {
        status: targetStatus,
        application_ids: targets.map((app) => app.apply_id),
        ...extraPayload,
      }
      const result = await updateEmployerApplicationStatusBulk(payload)
      const processed = result?.count ?? 0
      const label = STATUS_LABELS[targetStatus] ?? targetStatus

      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))

      if (processed === 0) {
        toast.error('No candidates were updated — they may have already reached a final stage.')
      } else if (processed < targets.length) {
        toast(
          `Moved ${processed} of ${targets.length} candidates to ${label}. The rest were already in a final stage.`,
          { icon: '⚠️' },
        )
      } else {
        toast.success(`Moved ${processed} candidate${processed > 1 ? 's' : ''} to ${label}.`)
      }

      return { success: processed > 0, processed }
    } catch (err) {
      const message = err.response?.data?.message
      if (err.response?.status === 403 && (message?.includes('Google Calendar not connected') || message?.includes('token expired'))) {
        toast('Redirecting to connect Google Calendar...', { icon: '🗓️' })
        try {
          const { url } = await connectGoogleCalendar()
          window.location.href = url
        } catch {
          toast.error('Failed to initiate Google Calendar connection.')
        }
      } else {
        const errors = err.response?.data?.errors
        const firstError = errors ? Object.values(errors)[0]?.[0] : null
        toast.error(firstError || message || 'Action failed.')
      }
      return { success: false, processed: 0 }
    } finally {
      setIsSubmitting(false)
    }
  }

  return { isSubmitting, runStatusChange }
}
