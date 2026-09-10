import { Badge } from '@/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AGE_GROUPS, CLASSIFICATION_CODES, EMPLOYER_MISMATCH_CODES, SEEKER_MISMATCH_CODES,
  educationCode, mismatchCodeLabel,
} from './jobFairResultVocab'
import pesoSeal from '@/assets/images/peso-urdaneta-seal.jpg'
import cityUrdanetaSeal from '@/assets/images/urdaneta-city-seal.jpg'

const ROWS_PER_PAGE = 15
const th = 'whitespace-nowrap border border-slate-300 bg-slate-100 px-1.5 py-1 text-center text-[9px] font-bold uppercase leading-tight text-slate-600'
const td = 'border border-slate-200 px-1.5 py-1 text-center text-xs text-slate-700'
const tdLeft = `${td} text-left`
const check = 'text-center text-sm font-black text-brand-navy'

function submittedBy(report) {
  if (report.source === 'admin_proxy') {
    const admin = report.encoded_by_admin
    const name = admin ? `${admin.first_name ?? ''} ${admin.last_name ?? ''}`.trim() : null
    return { name: name || 'PESO staff (Admin Proxy Encoded)', email: admin?.email }
  }
  const name = report.contact_person || report.employer?.representative_name
  return { name: name || 'N/A', email: report.employer?.email }
}

function educCodeFor(entry) {
  return educationCode(entry.highest_education)
}

function chunk(list, size) {
  const chunks = []
  for (let i = 0; i < list.length; i += size) chunks.push(list.slice(i, i + size))
  if (chunks.length === 0) chunks.push([])
  return chunks
}

/**
 * Read-only RO1-JF Form 3 preview for one establishment's result report —
 * shared by the admin per-employer "View" modal and the employer's own
 * "View Report" action. Laid out to mirror the physical paper form (same
 * 15-row-per-page register, same checkbox-style columns and legends) rather
 * than a generic data table, so this reads as the digital twin of what gets
 * downloaded as a PDF.
 *
 * @param {object} report
 * @param {object} [jobFair] the parent job fair (title/venue/dates) — passed
 *   separately rather than relying on report.job_fair, since neither the
 *   admin nor the employer payload eager-loads that relation on each report
 *   (the page already has the fair loaded once, so no need to duplicate it).
 */
export default function EstablishmentReportPreview({ report, jobFair }) {
  if (!report) return null
  const entries = report.entries ?? []
  const submitter = submittedBy(report)
  const pages = chunk(entries, ROWS_PER_PAGE)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {[
          ['Male', report.total_male, 'bg-slate-100 text-slate-700'],
          ['Female', report.total_female, 'bg-slate-100 text-slate-700'],
          ['Total', report.total_applicants, 'bg-slate-900 text-white'],
          ['Qualified', report.total_qualified, 'bg-blue-50 text-blue-700'],
          ['Near Hired', report.total_near_hired, 'bg-blue-50 text-blue-700'],
          ['HOTS', report.total_hots, 'bg-emerald-50 text-emerald-700'],
          ['Mismatched', report.total_rejected, 'bg-rose-50 text-rose-700'],
        ].map(([label, value, tone]) => (
          <span key={label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${tone}`}>
            <span className="text-sm font-black">{value ?? 0}</span>{label}
          </span>
        ))}
      </div>

      <div className="rounded-lg border-2 border-slate-800 p-4">
        <div className="flex items-start justify-between gap-4 border-b-2 border-slate-800 pb-3">
          <img src={pesoSeal} alt="PESO Urdaneta seal" className="h-16 w-16 shrink-0 object-contain" />
          <div className="flex-1 text-center">
            <h3 className="text-base font-black uppercase tracking-wide text-slate-900">Establishment Report</h3>
            <p className="text-xs font-bold text-slate-500">RO1-JF Form 3</p>
            <Badge className="mt-1.5" variant={report.source === 'admin_proxy' ? 'pending' : 'approved'} icon={false}>
              {report.source === 'admin_proxy' ? 'Admin Proxy Encoded' : 'Employer Self-Service'}
            </Badge>
          </div>
          <img src={cityUrdanetaSeal} alt="City of Urdaneta seal" className="h-16 w-16 shrink-0 object-contain" />
        </div>

        <div className="grid gap-4 border-b-2 border-slate-800 py-3 sm:grid-cols-2">
          <div className="text-xs leading-6">
            <p className="font-bold text-slate-800">Submitted by:</p>
            <div className="mt-1 h-6 w-52 border-b border-slate-400" />
            <p className="mt-0.5 text-[10px] text-slate-500">Signature over printed name</p>
            <p className="mt-1 font-semibold text-slate-800">{submitter.name}</p>
            <p className="mt-2 font-bold text-slate-800">E-mail Address and Mobile no.:</p>
            <p className="text-slate-700">{submitter.email || 'N/A'}{report.contact_number ? ` / ${report.contact_number}` : ''}</p>
          </div>
          <div className="text-xs leading-6">
            <p><span className="font-bold uppercase text-slate-500">Name of Establishment: </span><span className="font-bold text-slate-900">{report.company_name}</span></p>
            <p><span className="font-bold uppercase text-slate-500">Office Location: </span><span className="font-bold text-slate-900">{report.office_location || 'N/A'}</span></p>
            <p><span className="font-bold uppercase text-slate-500">Date of Activity: </span><span className="font-bold text-slate-900">{jobFair?.start_date || jobFair?.event_date || 'N/A'}</span></p>
            <p><span className="font-bold uppercase text-slate-500">Job Fair Clearance No.: </span><span className="font-bold text-slate-900">{report.clearance_no || '—'}</span></p>
            <p><span className="font-bold uppercase text-slate-500">Job Fair Venue / Platform: </span><span className="font-bold text-slate-900">{jobFair?.title} · {jobFair?.venue}</span></p>
          </div>
        </div>

        {pages.map((pageEntries, pageIndex) => (
          <div key={pageIndex} className={pageIndex > 0 ? 'mt-4' : 'mt-3'}>
            {pages.length > 1 && (
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Page {pageIndex + 1} of {pages.length}</p>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={th} rowSpan={2}>#</TableHead>
                  <TableHead className={th} rowSpan={2}>Name of Jobseeker</TableHead>
                  <TableHead className={th} rowSpan={2}>Position</TableHead>
                  <TableHead className={th} rowSpan={2}>Sex</TableHead>
                  <TableHead className={th} rowSpan={2}>City/Municipality</TableHead>
                  <TableHead className={th} rowSpan={2}>Tel/Cell No.</TableHead>
                  <TableHead className={th} rowSpan={2}>Classification<br /><span className="normal-case text-slate-400">(code below)</span></TableHead>
                  <TableHead className={th} rowSpan={2}>Age Group</TableHead>
                  <TableHead className={th} colSpan={6}>Highest Educational Attainment</TableHead>
                  <TableHead className={th} colSpan={5}>Status of Application</TableHead>
                  <TableHead className={th} colSpan={2}>Reason for Job Mismatch</TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className={th}>E</TableHead><TableHead className={th}>HS</TableHead><TableHead className={th}>K-12</TableHead>
                  <TableHead className={th}>V</TableHead><TableHead className={th}>C</TableHead><TableHead className={th}>PG</TableHead>
                  <TableHead className={th}>Qualified</TableHead><TableHead className={th}>Near<br />Hired</TableHead><TableHead className={th}>Hired-on-<br />the-spot</TableHead>
                  <TableHead className={th}>Mismatch<br />(Employer)</TableHead><TableHead className={th}>Mismatch<br />(Job Seeker)</TableHead>
                  <TableHead className={th}>Employer</TableHead><TableHead className={th}>Job Seeker</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: ROWS_PER_PAGE }, (_, row) => {
                  const entry = pageEntries[row]
                  const rowNumber = row + 1
                  if (!entry) {
                    return (
                      <TableRow key={row}>
                        <TableCell className={td}>{rowNumber}</TableCell>
                        <TableCell className={td} colSpan={20}>&nbsp;</TableCell>
                      </TableRow>
                    )
                  }
                  const educCode = educCodeFor(entry)
                  const classifications = entry.classification_codes ?? []
                  return (
                    <TableRow key={row}>
                      <TableCell className={td}>{rowNumber}</TableCell>
                      <TableCell className={tdLeft}>{entry.applicant_name}</TableCell>
                      <TableCell className={tdLeft}>{entry.position_applied_for}</TableCell>
                      <TableCell className={td}>{entry.gender?.[0]?.toUpperCase()}</TableCell>
                      <TableCell className={td}>{entry.city_municipality || '—'}</TableCell>
                      <TableCell className={td}>{entry.contact_number || '—'}</TableCell>
                      <TableCell className={td}>{classifications.length ? classifications.join(', ') : '—'}</TableCell>
                      <TableCell className={td}>{entry.age_group || '—'}</TableCell>
                      <TableCell className={`${td} ${check}`}>{educCode === 'E' ? '✓' : ''}</TableCell>
                      <TableCell className={`${td} ${check}`}>{educCode === 'HS' ? '✓' : ''}</TableCell>
                      <TableCell className={`${td} ${check}`}>{educCode === 'K-12' ? '✓' : ''}</TableCell>
                      <TableCell className={`${td} ${check}`}>{educCode === 'V' ? '✓' : ''}</TableCell>
                      <TableCell className={`${td} ${check}`}>{educCode === 'C' ? '✓' : ''}</TableCell>
                      <TableCell className={`${td} ${check}`}>{educCode === 'PG' ? '✓' : ''}</TableCell>
                      <TableCell className={`${td} ${check}`}>{entry.status === 'qualified' ? '✓' : ''}</TableCell>
                      <TableCell className={`${td} ${check}`}>{entry.status === 'near_hired' ? '✓' : ''}</TableCell>
                      <TableCell className={`${td} ${check}`}>{entry.status === 'hots' ? '✓' : ''}</TableCell>
                      <TableCell className={`${td} ${check}`}>{entry.status === 'employer_mismatch' ? '✓' : ''}</TableCell>
                      <TableCell className={`${td} ${check}`}>{entry.status === 'seeker_mismatch' ? '✓' : ''}</TableCell>
                      <TableCell className={td}>{entry.status === 'employer_mismatch' ? entry.mismatch_code : '—'}</TableCell>
                      <TableCell className={td}>{entry.status === 'seeker_mismatch' ? entry.mismatch_code : '—'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ))}

        <div className="mt-4 grid gap-3 border-t-2 border-slate-800 pt-3 sm:grid-cols-3">
          <div className="rounded-md border border-slate-300 p-2">
            <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">Classification of Jobseekers</p>
            {CLASSIFICATION_CODES.map(([code, label]) => <p key={code} className="text-[10px] leading-relaxed text-slate-600">({code}) {label}</p>)}
          </div>
          <div className="rounded-md border border-slate-300 p-2">
            <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">Employer Mismatch</p>
            {EMPLOYER_MISMATCH_CODES.map(([code, label]) => <p key={code} className="text-[10px] leading-relaxed text-slate-600">({code}) {label}</p>)}
          </div>
          <div className="rounded-md border border-slate-300 p-2">
            <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">Job Seeker Mismatch</p>
            {SEEKER_MISMATCH_CODES.map(([code, label]) => <p key={code} className="text-[10px] leading-relaxed text-slate-600">({code}) {label}</p>)}
            <p className="mt-2 text-[10px] font-bold uppercase text-slate-500">Age Group</p>
            <p className="text-[10px] leading-relaxed text-slate-600">{AGE_GROUPS.map(([code, label]) => `${code}: ${label}`).join(' · ')}</p>
          </div>
        </div>
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
    </div>
  )
}
