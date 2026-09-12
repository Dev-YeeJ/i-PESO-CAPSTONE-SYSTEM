import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const cellInputClass = 'w-full min-w-[7rem] rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm hover:border-slate-200 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy/20'

export const blankConfirmationVacancy = () => ({
  job_vacancy_id: null, number_needed: '', position_title: '', qualifications: '', place_of_work: '',
})

/** Drop rows nobody has typed anything into yet before sending to the server. */
export const stripBlankConfirmationVacancies = (vacancies) => vacancies.filter((row) => String(row.position_title || '').trim() || row.number_needed)

/**
 * "LIST OF VACANCIES/ORDERS" table on the Confirmation Slip — mirrors
 * PlacementRecordEditor.jsx's established conventions. When `myVacancies` is
 * given (the employer's own postings), each row also gets a "Use an
 * existing posting" picker that auto-fills the row from that posting — the
 * fields stay editable afterward, so a picked posting is a starting point,
 * not a lock. Omitted entirely for the admin proxy (walk-in/paper-only)
 * form, which has no employer account to pick postings from.
 */
export default function ConfirmationVacancyEditor({ vacancies, onChange, myVacancies }) {
  const update = (index, key, value) => onChange(vacancies.map((row, i) => (i === index ? { ...row, [key]: value } : row)))

  const applyExistingVacancy = (index, vacancyId) => {
    if (!vacancyId) {
      update(index, 'job_vacancy_id', null)
      return
    }
    const posting = myVacancies?.find((item) => String(item.post_id) === String(vacancyId))
    if (!posting) return
    onChange(vacancies.map((row, i) => (i === index
      ? {
          ...row,
          job_vacancy_id: posting.post_id,
          position_title: posting.job_title || row.position_title,
          number_needed: posting.vacancies_count || row.number_needed,
          qualifications: posting.job_description || row.qualifications,
          place_of_work: posting.location || posting.city_municipality || row.place_of_work,
        }
      : row)))
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {myVacancies && <TableHead>Use existing posting</TableHead>}
              <TableHead>Number Needed *</TableHead>
              <TableHead>Position Title *</TableHead>
              <TableHead>Qualifications</TableHead>
              <TableHead>Place of Work</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {vacancies.map((row, index) => (
              <TableRow key={index}>
                {myVacancies && (
                  <TableCell>
                    <select value={row.job_vacancy_id || ''} onChange={(e) => applyExistingVacancy(index, e.target.value)} className={cellInputClass}>
                      <option value="">— Type manually —</option>
                      {myVacancies.map((posting) => <option key={posting.post_id} value={posting.post_id}>{posting.job_title}</option>)}
                    </select>
                  </TableCell>
                )}
                <TableCell><input type="number" min="0" value={row.number_needed} onChange={(e) => update(index, 'number_needed', e.target.value)} placeholder="Number needed" className={cellInputClass} /></TableCell>
                <TableCell><input value={row.position_title} onChange={(e) => update(index, 'position_title', e.target.value)} placeholder="Position title" className={cellInputClass} /></TableCell>
                <TableCell><input value={row.qualifications} onChange={(e) => update(index, 'qualifications', e.target.value)} placeholder="Qualifications" className={cellInputClass} /></TableCell>
                <TableCell><input value={row.place_of_work} onChange={(e) => update(index, 'place_of_work', e.target.value)} placeholder="Place of work" className={cellInputClass} /></TableCell>
                <TableCell>
                  <button type="button" onClick={() => onChange(vacancies.filter((_, i) => i !== index))} aria-label="Remove vacancy" className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button type="button" variant="outline" icon={Plus} onClick={() => onChange([...vacancies, blankConfirmationVacancy()])}>Add Vacancy</Button>
    </div>
  )
}
