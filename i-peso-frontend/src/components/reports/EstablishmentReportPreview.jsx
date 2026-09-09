import { Badge } from '@/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AGE_GROUPS, CLASSIFICATION_CODES, EMPLOYER_MISMATCH_CODES, SEEKER_MISMATCH_CODES,
  educationCode, mismatchCodeLabel, statusLabel,
} from './jobFairResultVocab'

function submittedBy(report) {
  if (report.source === 'admin_proxy') {
    const admin = report.encoded_by_admin
    const name = admin ? `${admin.first_name ?? ''} ${admin.last_name ?? ''}`.trim() : null
    return { name: name || 'PESO staff (Admin Proxy Encoded)', email: admin?.email }
  }
  const name = report.contact_person || report.employer?.representative_name
  return { name: name || 'N/A', email: report.employer?.email }
}

/**
 * Read-only RO1-JF Form 3 preview for one establishment's result report —
 * shared by the admin per-employer "View" modal and the employer's own
 * "View Report" action so both see (and can sanity-check) exactly what the
 * downloaded PDF will contain.
 */
export default function EstablishmentReportPreview({ report }) {
  if (!report) return null
  const entries = report.entries ?? []
  const submitter = submittedBy(report)

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase text-slate-500">Establishment</p>
          <p className="text-sm font-bold text-slate-900">{report.company_name}</p>
          {report.office_location && <p className="text-xs text-slate-500">{report.office_location}</p>}
        </div>
        <div>
          <p className="text-[11px] font-extrabold uppercase text-slate-500">Job Fair Clearance No.</p>
          <p className="text-sm font-bold text-slate-900">{report.clearance_no || '—'}</p>
        </div>
        <div>
          <p className="text-[11px] font-extrabold uppercase text-slate-500">Source</p>
          <Badge variant={report.source === 'admin_proxy' ? 'pending' : 'approved'} icon={false}>
            {report.source === 'admin_proxy' ? 'Admin Proxy Encoded' : 'Employer Self-Service'}
          </Badge>
        </div>
        <div>
          <p className="text-[11px] font-extrabold uppercase text-slate-500">Submitted by</p>
          <p className="text-sm font-bold text-slate-900">{submitter.name}</p>
          {submitter.email && <p className="text-xs text-slate-500">{submitter.email}{report.contact_number ? ` · ${report.contact_number}` : ''}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['Male', report.total_male, 'bg-slate-100 text-slate-700'],
          ['Female', report.total_female, 'bg-slate-100 text-slate-700'],
          ['Total', report.total_applicants, 'bg-slate-900 text-white'],
          ['Qualified', report.total_qualified, 'bg-blue-50 text-blue-700'],
          ['Near Hired', report.total_near_hired, 'bg-blue-50 text-blue-700'],
          ['HOTS', report.total_hots, 'bg-emerald-50 text-emerald-700'],
          ['Mismatched', report.total_rejected, 'bg-rose-50 text-rose-700'],
          ['Vacancies Solicited', report.total_vacancies_solicited, 'bg-slate-100 text-slate-700'],
          ['Vacancies Offered', report.total_vacancies_offered, 'bg-slate-100 text-slate-700'],
        ].map(([label, value, tone]) => (
          <span key={label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${tone}`}>
            <span className="text-sm font-black">{value ?? 0}</span>{label}
          </span>
        ))}
      </div>

      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead><TableHead>Name of Jobseeker</TableHead><TableHead>Position</TableHead>
              <TableHead>Sex</TableHead><TableHead>City/Municipality</TableHead><TableHead>Contact</TableHead>
              <TableHead>Classification</TableHead><TableHead>Age Group</TableHead><TableHead>Educ.</TableHead>
              <TableHead>Status of Application</TableHead><TableHead>Mismatch Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="py-8 text-center text-sm text-slate-400">No per-applicant register was encoded for this report.</TableCell></TableRow>
            ) : entries.map((entry, index) => (
              <TableRow key={entry.id ?? index}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-semibold text-slate-800">{entry.applicant_name}</TableCell>
                <TableCell>{entry.position_applied_for}</TableCell>
                <TableCell>{entry.gender?.[0]?.toUpperCase()}</TableCell>
                <TableCell>{entry.city_municipality || '—'}</TableCell>
                <TableCell>{entry.contact_number || '—'}</TableCell>
                <TableCell>{(entry.classification_codes ?? []).length ? entry.classification_codes.join(', ') : '—'}</TableCell>
                <TableCell>{entry.age_group || '—'}</TableCell>
                <TableCell>{educationCode(entry.highest_education) || '—'}</TableCell>
                <TableCell>{statusLabel(entry.status)}</TableCell>
                <TableCell>{entry.mismatch_code ? `(${entry.mismatch_code}) ${mismatchCodeLabel(entry.mismatch_code)}` : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {(report.mismatch_tallies ?? []).length > 0 && (
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="mb-2 text-[11px] font-extrabold uppercase text-slate-500">Mismatch Breakdown</p>
          <div className="flex flex-wrap gap-2">
            {report.mismatch_tallies.map((tally) => (
              <span key={tally.mismatch_code} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                ({tally.mismatch_code}) {mismatchCodeLabel(tally.mismatch_code)} · {tally.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {report.remarks && (
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="mb-1 text-[11px] font-extrabold uppercase text-slate-500">Remarks</p>
          <p className="text-sm text-slate-700">{report.remarks}</p>
        </div>
      )}

      <div className="grid gap-3 text-[11px] text-slate-500 sm:grid-cols-3">
        <div>
          <p className="font-extrabold uppercase text-slate-500">Jobseeker Classification</p>
          {CLASSIFICATION_CODES.map(([code, label]) => <p key={code}>({code}) {label}</p>)}
        </div>
        <div>
          <p className="font-extrabold uppercase text-slate-500">Employer Mismatch</p>
          {EMPLOYER_MISMATCH_CODES.map(([code, label]) => <p key={code}>({code}) {label}</p>)}
        </div>
        <div>
          <p className="font-extrabold uppercase text-slate-500">Job Seeker Mismatch</p>
          {SEEKER_MISMATCH_CODES.map(([code, label]) => <p key={code}>({code}) {label}</p>)}
          <p className="mt-2 font-extrabold uppercase text-slate-500">Age Group</p>
          <p>{AGE_GROUPS.map(([code, label]) => `${code}: ${label}`).join(' · ')}</p>
        </div>
      </div>
    </div>
  )
}
