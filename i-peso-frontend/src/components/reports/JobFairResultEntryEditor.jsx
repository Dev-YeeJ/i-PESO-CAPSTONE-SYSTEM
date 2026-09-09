import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AGE_GROUPS, CLASSIFICATION_CODES, EDUCATION_LEVELS, EMPLOYER_MISMATCH_CODES,
  SEEKER_MISMATCH_CODES, STATUS_OPTIONS, blankResultEntry,
} from './jobFairResultVocab'

const cellInputClass = 'w-full min-w-[7rem] rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm hover:border-slate-200 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy/20'
const MISMATCH_STATUSES = ['employer_mismatch', 'seeker_mismatch']

/**
 * Per-applicant register editor for a RO1-JF Form 3 result report — shared by
 * the employer self-service "Post-Event Results" tab and the admin proxy
 * "Paper encoding" tab so both produce the exact same entry shape.
 */
export default function JobFairResultEntryEditor({ entries, onChange }) {
  const update = (index, key, value) => onChange(entries.map((row, i) => (i === index
    ? { ...row, [key]: value, ...(key === 'status' && !MISMATCH_STATUSES.includes(value) ? { mismatch_code: '' } : {}) }
    : row)))

  const toggleClassification = (index, code) => onChange(entries.map((row, i) => (i === index
    ? {
        ...row,
        classification_codes: row.classification_codes.includes(code)
          ? row.classification_codes.filter((c) => c !== code)
          : [...row.classification_codes, code],
      }
    : row)))

  const mismatchOptionsFor = (status) => (status === 'employer_mismatch' ? EMPLOYER_MISMATCH_CODES : status === 'seeker_mismatch' ? SEEKER_MISMATCH_CODES : [])

  return (
    <div className="space-y-3">
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Applicant</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>City / Municipality</TableHead>
              <TableHead>Contact no.</TableHead>
              <TableHead>Age group</TableHead>
              <TableHead>Highest educ.</TableHead>
              <TableHead>Classification</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Status of application</TableHead>
              <TableHead>Mismatch reason</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry, index) => (
              <TableRow key={index}>
                <TableCell><input value={entry.applicant_name} onChange={(e) => update(index, 'applicant_name', e.target.value)} placeholder="Full name" className={cellInputClass} /></TableCell>
                <TableCell>
                  <select value={entry.gender} onChange={(e) => update(index, 'gender', e.target.value)} className={cellInputClass}>
                    <option value="male">Male</option><option value="female">Female</option>
                  </select>
                </TableCell>
                <TableCell><input value={entry.city_municipality} onChange={(e) => update(index, 'city_municipality', e.target.value)} placeholder="City / Municipality" className={cellInputClass} /></TableCell>
                <TableCell><input value={entry.contact_number} onChange={(e) => update(index, 'contact_number', e.target.value)} placeholder="Contact no." className={cellInputClass} /></TableCell>
                <TableCell>
                  <select value={entry.age_group} onChange={(e) => update(index, 'age_group', e.target.value)} className={cellInputClass}>
                    <option value="">—</option>
                    {AGE_GROUPS.map(([code, label]) => <option key={code} value={code}>{code} · {label}</option>)}
                  </select>
                </TableCell>
                <TableCell>
                  <select value={entry.highest_education} onChange={(e) => update(index, 'highest_education', e.target.value)} className={cellInputClass}>
                    <option value="">—</option>
                    {EDUCATION_LEVELS.map(([value, label, code]) => <option key={value} value={value}>{code} · {label}</option>)}
                  </select>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {CLASSIFICATION_CODES.map(([code, label]) => (
                      <button
                        key={code}
                        type="button"
                        title={label}
                        onClick={() => toggleClassification(index, code)}
                        className={`h-6 w-6 rounded-md border text-xs font-bold ${entry.classification_codes.includes(code) ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400'}`}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </TableCell>
                <TableCell><input value={entry.position_applied_for} onChange={(e) => update(index, 'position_applied_for', e.target.value)} placeholder="Position" className={cellInputClass} /></TableCell>
                <TableCell>
                  <select value={entry.status} onChange={(e) => update(index, 'status', e.target.value)} className={cellInputClass}>
                    {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </TableCell>
                <TableCell>
                  <select disabled={!MISMATCH_STATUSES.includes(entry.status)} value={entry.mismatch_code} onChange={(e) => update(index, 'mismatch_code', e.target.value)} className={`${cellInputClass} disabled:opacity-40`}>
                    <option value="">—</option>
                    {mismatchOptionsFor(entry.status).map(([code, label]) => <option key={code} value={code}>({code}) {label}</option>)}
                  </select>
                </TableCell>
                <TableCell>
                  <button type="button" onClick={() => onChange(entries.filter((_, i) => i !== index))} aria-label="Remove applicant" className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button type="button" variant="outline" icon={Plus} onClick={() => onChange([...entries, blankResultEntry()])}>Add Applicant</Button>
    </div>
  )
}
