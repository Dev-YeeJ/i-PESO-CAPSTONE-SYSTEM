import { useState } from 'react'
import { Flag } from 'lucide-react'
import ReportConcernDialog from './ReportConcernDialog'

/**
 * Quiet "report this applicant" entry point for the employer's applicant
 * views. Always tied to the application, so PESO sees the recruitment context
 * and an employer can only report people who actually applied to them.
 */
export default function ReportApplicantButton({ applicationId, applicantName, jobTitle, className = '' }) {
  const [open, setOpen] = useState(false)
  if (!applicationId) return null

  return (
    <>
      <div className={`rounded-xl border border-slate-200 bg-white p-4 text-sm ${className}`}>
        <p className="font-bold text-slate-800">Concern about this applicant?</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          For false information, suspicious documents, harassment or a missed confirmed interview. PESO reviews every report before anything happens, and the applicant isn't told who reported them.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
        >
          <Flag className="h-3.5 w-3.5" />Report to PESO
        </button>
      </div>
      <ReportConcernDialog
        open={open}
        role="employer"
        target={{ subjectName: applicantName || 'this applicant', applicationId, postTitle: jobTitle || null }}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
