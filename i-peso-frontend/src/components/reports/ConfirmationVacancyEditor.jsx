import { useState } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Plus, Trash2, Unlink, FileSearch } from 'lucide-react'
import { Button } from '@/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

const cellInputClass = 'w-full min-w-[8rem] rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/10'
const lockedCellClass = 'w-full rounded-lg border border-transparent bg-slate-50 px-2.5 py-2 text-sm text-slate-600'

export const blankConfirmationVacancy = () => ({
  job_vacancy_id: null, number_needed: '', position_title: '', qualifications: '', place_of_work: '',
})

/** Drop rows nobody has typed anything into yet before sending to the server. */
export const stripBlankConfirmationVacancies = (vacancies) => vacancies.filter((row) => String(row.position_title || '').trim() || row.number_needed)

/**
 * "LIST OF VACANCIES/ORDERS" table on the Confirmation Slip — mirrors
 * PlacementRecordEditor.jsx's established conventions. When `myVacancies` is
 * given (the employer's own postings), a picker above the table adds a new
 * row pre-filled from a chosen posting. That row's Position Title,
 * Qualifications, and Place of Work stay locked to the posting they came
 * from (edit the posting itself if those are wrong) — Number Needed is
 * still free to differ, since how many of the role you're bringing to *this*
 * job fair is independent of the posting's total opening count. "Unlink"
 * detaches a row back to plain manual entry. Rows added via "Add Vacancy"
 * are manual from the start and always fully editable. The picker is
 * omitted entirely for the admin proxy (walk-in/paper-only) form, which has
 * no employer account to pick postings from.
 */
export default function ConfirmationVacancyEditor({ vacancies, onChange, myVacancies }) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const update = (index, key, value) => onChange(vacancies.map((row, i) => (i === index ? { ...row, [key]: value } : row)))
  const unlink = (index) => update(index, 'job_vacancy_id', null)

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
    setDialogOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="primary" icon={Plus} onClick={() => onChange([...vacancies, blankConfirmationVacancy()])}>
          Add Custom Vacancy
        </Button>

        {!!myVacancies?.length && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" icon={FileSearch}>
                Add from Existing Posting
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add from Existing Postings</DialogTitle>
                <DialogDescription>
                  Select an active job posting to add it to your job fair vacancies.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-2 grid gap-3">
                {myVacancies.map((posting) => {
                  const alreadyAdded = vacancies.some((v) => String(v.job_vacancy_id) === String(posting.post_id))
                  return (
                    <div key={posting.post_id} className={`flex items-center justify-between p-4 border rounded-xl transition-colors ${alreadyAdded ? 'border-slate-100 bg-slate-50 opacity-60' : 'border-slate-200 bg-white hover:border-brand-navy/30 hover:shadow-sm'}`}>
                      <div className="pr-4">
                        <h4 className="font-bold text-slate-900">{posting.job_title}</h4>
                        <p className="mt-1 text-sm text-slate-500 line-clamp-1">{posting.location || posting.city_municipality || 'Location not specified'}</p>
                      </div>
                      <Button
                        type="button"
                        variant={alreadyAdded ? 'outline' : 'primary'}
                        disabled={alreadyAdded}
                        className="shrink-0"
                        onClick={() => addFromExistingPosting(posting.post_id)}
                      >
                        {alreadyAdded ? 'Added' : 'Add'}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="w-[15%]">Number Needed *</TableHead>
              <TableHead className="w-[25%]">Position Title *</TableHead>
              <TableHead className="w-[35%]">Qualifications</TableHead>
              <TableHead className="w-[20%]">Place of Work</TableHead>
              <TableHead className="w-[5%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence initial={false}>
              {vacancies.map((row, index) => {
                const linked = !!row.job_vacancy_id
                return (
                  <Motion.tr
                    key={index}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <TableCell className="align-top pt-4">
                      <input type="number" min="0" value={row.number_needed} onChange={(e) => update(index, 'number_needed', e.target.value)} placeholder="0" className={cellInputClass} />
                    </TableCell>
                    <TableCell className="align-top pt-4">
                      {linked ? (
                        <div className={lockedCellClass} title={row.position_title}>
                          <span className="line-clamp-2">{row.position_title}</span>
                        </div>
                      ) : (
                        <input value={row.position_title} onChange={(e) => update(index, 'position_title', e.target.value)} placeholder="Position title" className={cellInputClass} />
                      )}
                    </TableCell>
                    <TableCell className="align-top pt-4">
                      {linked ? (
                        <div className={lockedCellClass} title={row.qualifications}>
                          <span className="line-clamp-3">{row.qualifications || '—'}</span>
                        </div>
                      ) : (
                        <textarea rows={2} value={row.qualifications} onChange={(e) => update(index, 'qualifications', e.target.value)} placeholder="Qualifications" className={`${cellInputClass} resize-y min-h-[42px]`} />
                      )}
                    </TableCell>
                    <TableCell className="align-top pt-4">
                      {linked ? (
                        <div className={lockedCellClass} title={row.place_of_work}>
                          <span className="line-clamp-2">{row.place_of_work || '—'}</span>
                        </div>
                      ) : (
                        <input value={row.place_of_work} onChange={(e) => update(index, 'place_of_work', e.target.value)} placeholder="Place of work" className={cellInputClass} />
                      )}
                    </TableCell>
                    <TableCell className="align-top pt-4">
                      <div className="flex items-center justify-end gap-1">
                        {linked && (
                          <button type="button" onClick={() => unlink(index)} title="Unlink from posting — makes every field editable" className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-bold text-brand-navy transition-colors hover:bg-blue-50">
                            <Unlink className="h-4 w-4" />
                          </button>
                        )}
                        <button type="button" onClick={() => onChange(vacancies.filter((_, i) => i !== index))} aria-label="Remove vacancy" className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </Motion.tr>
                )
              })}
            </AnimatePresence>
          </TableBody>
        </Table>
        {vacancies.length === 0 && (
          <div className="bg-slate-50/50 p-8 text-center text-sm text-slate-500">No vacancies added yet. Click "Add Custom Vacancy" or "Add from Existing Posting" to get started.</div>
        )}
      </div>
    </div>
  )
}
