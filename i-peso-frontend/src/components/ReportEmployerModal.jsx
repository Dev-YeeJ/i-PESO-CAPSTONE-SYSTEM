import ReportConcernDialog from '@/components/safety/ReportConcernDialog'

/**
 * A job seeker reports an employer or company. Kept as the entry point the
 * company profile, job map and applications pages already use; the form
 * itself is the shared Report & Safety dialog.
 *
 * employer: { employer_id, employer_name }
 * vacancy:  { post_id, job_title } when reporting from a specific job vacancy
 * applicationId: when reporting from one of the seeker's applications
 */
export default function ReportEmployerModal({ open, employer, vacancy = null, applicationId = null, onClose }) {
  const employerId = employer?.employer_id
  if (!open || !employerId) return null

  return (
    <ReportConcernDialog
      open
      role="seeker"
      target={{
        subjectId: employerId,
        subjectName: employer?.employer_name || 'this employer',
        postId: vacancy?.post_id ?? null,
        postTitle: vacancy?.job_title ?? null,
        applicationId,
      }}
      onClose={onClose}
    />
  )
}
