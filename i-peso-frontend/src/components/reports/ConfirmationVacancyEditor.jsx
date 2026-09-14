import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const cellInputClass = 'w-full min-w-[8rem] rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/10'

export const blankConfirmationVacancy = () => ({
  job_vacancy_id: null, number_needed: '', position_title: '', qualifications: '', place_of_work: '',
})

/** Drop rows nobody has typed anything into yet before sending to the server. */
export const stripBlankConfirmationVacancies = (vacancies) => vacancies.filter((row) => String(row.position_title || '').trim() || row.number_needed)

/**
 * "LIST OF VACANCIES/ORDERS" table on the Confirmation Slip — mirrors
 * PlacementRecordEditor.jsx's established conventions. The table itself is
 * always plain manual entry; when `myVacancies` is given (the employer's own
 * postings), a picker above the table adds a new row pre-filled from a
 * chosen posting — a convenient starting point, not a lock, so every field
 * (including one added this way) stays freely editable afterward. Omitted
 * entirely for the admin proxy (walk-in/paper-only) form, which has no
 * employer account to pick postings from.
 */
export default function ConfirmationVacancyEditor({ vacancies, onChange, myVacancies }) {
  const [picking, setPicking] = useState('')
  const update = (index, key, value) => onChange(vacancies.map((row, i) => (i === index ? { ...row, [key]: value } : row)))

  const addFromExistingPosting = (vacancyId) => {
    const posting = myVacancies?.find((item) => String(item.post_id) === String(vacancyId))
    if (!posting) return
    onChange([
      ...vacancies,
      {
        job_vacancy_id: posting.post_id,
        number_needed: posting.vacancies_count || '',
        position_title: posting.job_title || '',
        qualifications: posting.job_description || '',
        place_of_work: posting.location || posting.city_municipality || '',
      },
    ])
    setPicking('')
  }

  return (
    <div className="space-y-3">
      {!!myVacancies?.length && (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={picking} onValueChange={addFromExistingPosting}>
            <SelectTrigger className="h-9 w-full max-w-xs rounded-lg border-slate-200 px-2.5 py-1.5 text-sm">
              <SelectValue placeholder="Use an existing posting…" />
            </SelectTrigger>
            <SelectContent>
              {myVacancies.map((posting) => <SelectItem key={posting.post_id} value={String(posting.post_id)}>{posting.job_title}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-slate-500">Adds a row pre-filled from that posting — still editable below.</span>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
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
              <TableCell><input type="number" min="0" value={row.number_needed} onChange={(e) => update(index, 'number_needed', e.target.value)} placeholder="0" className={cellInputClass} /></TableCell>
              <TableCell><input value={row.position_title} onChange={(e) => update(index, 'position_title', e.target.value)} placeholder="Position title" className={cellInputClass} /></TableCell>
              <TableCell><input value={row.qualifications} onChange={(e) => update(index, 'qualifications', e.target.value)} placeholder="Qualifications" className={cellInputClass} /></TableCell>
              <TableCell><input value={row.place_of_work} onChange={(e) => update(index, 'place_of_work', e.target.value)} placeholder="Place of work" className={cellInputClass} /></TableCell>
              <TableCell>
                <button type="button" onClick={() => onChange(vacancies.filter((_, i) => i !== index))} aria-label="Remove vacancy" className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {vacancies.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">No vacancies added yet.</div>
      )}
      <Button type="button" variant="outline" icon={Plus} onClick={() => onChange([...vacancies, blankConfirmationVacancy()])}>Add Vacancy</Button>
    </div>
  )
}
