import { useState } from 'react'
import { Pencil, Plus, Trash2, UserRoundPlus } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useFieldArray, useWatch, Controller } from 'react-hook-form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ApplicantNameSuggest from './ApplicantNameSuggest'
import {
  AGE_GROUPS, CLASSIFICATION_CODES, EDUCATION_LEVELS, EMPLOYER_MISMATCH_CODES,
  SEEKER_MISMATCH_CODES, STATUS_OPTIONS, blankResultEntry, statusLabel,
} from './jobFairResultVocab'

const MISMATCH_STATUSES = ['employer_mismatch', 'seeker_mismatch']
const STATUS_BADGE = { qualified: 'review', near_hired: 'review', hots: 'verified', employer_mismatch: 'rejected', seeker_mismatch: 'rejected' }
const fieldClass = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/20'

/**
 * Per-applicant register editor for a RO1-JF Form 3 result report.
 * Uses react-hook-form's useFieldArray internally.
 */
export default function JobFairResultEntryEditor({ control, name, searchApplicants }) {
  const { fields, append, update, remove } = useFieldArray({ control, name })
  const entries = useWatch({ control, name }) || []

  const [draftIndex, setDraftIndex] = useState(null) // array index being edited, 'new', or null
  const [draft, setDraft] = useState(null)

  const duplicateSeekerIds = new Set(
    entries.map((row) => row.seeker_id).filter((id, index, all) => id && all.indexOf(id) !== index),
  )

  const openNew = () => { setDraft(blankResultEntry()); setDraftIndex('new') }
  const openEdit = (index) => { setDraft({ ...entries[index] }); setDraftIndex(index) }
  const closeModal = () => { setDraft(null); setDraftIndex(null) }
  const removeEntry = (index) => remove(index)

  const canSave = Boolean(draft?.applicant_name && draft?.position_applied_for)
  const saveDraft = () => {
    if (!canSave) return
    if (draftIndex === 'new') {
      append(draft)
    } else {
      update(draftIndex, draft)
    }
    closeModal()
  }

  const updateDraft = (patch) => setDraft((current) => ({
    ...current,
    ...patch,
    ...(patch.status && !MISMATCH_STATUSES.includes(patch.status) ? { mismatch_code: '' } : {}),
  }))

  const applyApplicantSuggestion = (suggestion) => updateDraft({
    applicant_name: suggestion.name ?? draft.applicant_name,
    seeker_id: suggestion.seeker_id ?? null,
    gender: suggestion.gender ?? draft.gender,
    city_municipality: suggestion.city_municipality ?? draft.city_municipality,
    contact_number: suggestion.contact_number ?? draft.contact_number,
    age_group: suggestion.age_group ?? draft.age_group,
    highest_education: suggestion.highest_education ?? draft.highest_education,
    classification_codes: suggestion.classification_codes?.length ? suggestion.classification_codes : draft.classification_codes,
  })

  const toggleClassification = (code) => updateDraft({
    classification_codes: draft.classification_codes.includes(code)
      ? draft.classification_codes.filter((c) => c !== code)
      : [...draft.classification_codes, code],
  })

  const mismatchOptionsFor = (status) => (status === 'employer_mismatch' ? EMPLOYER_MISMATCH_CODES : status === 'seeker_mismatch' ? SEEKER_MISMATCH_CODES : [])

  return (
    <div className="space-y-3">
      {entries.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center transition-colors hover:border-slate-300 hover:bg-slate-100">
          <UserRoundPlus className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-500">No applicants added yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs text-slate-600 whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 uppercase tracking-wide text-slate-500 font-extrabold text-[10px]">
              <tr>
                <th className="px-3 py-3 text-center border-r border-slate-200 w-10">#</th>
                <th className="px-4 py-3 border-r border-slate-200">Name of Jobseeker</th>
                <th className="px-4 py-3 border-r border-slate-200">Position Applying For</th>
                <th className="px-3 py-3 border-r border-slate-200">Sex</th>
                <th className="px-4 py-3 border-r border-slate-200">Contact Details</th>
                <th className="px-4 py-3 border-r border-slate-200">Classification</th>
                <th className="px-3 py-3 border-r border-slate-200">Age Group</th>
                <th className="px-3 py-3 border-r border-slate-200">Education</th>
                <th className="px-4 py-3 border-r border-slate-200">Status</th>
                <th className="px-4 py-3 border-r border-slate-200">Mismatch Reason</th>
                <th className="px-3 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry, index) => (
                <tr key={fields[index]?.id || index} className="group hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2 text-center border-r border-slate-100 text-slate-400 font-medium">{index + 1}</td>
                  <td className="px-4 py-2 border-r border-slate-100">
                    <p className="font-bold text-slate-900">{entry.applicant_name || '—'}</p>
                    {entry.seeker_id && duplicateSeekerIds.has(entry.seeker_id) && <span className="inline-block rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800">Duplicate</span>}
                  </td>
                  <td className="px-4 py-2 border-r border-slate-100">{entry.position_applied_for || '—'}</td>
                  <td className="px-3 py-2 border-r border-slate-100 font-semibold">{entry.gender?.[0]?.toUpperCase() || '—'}</td>
                  <td className="px-4 py-2 border-r border-slate-100 text-[11px] leading-tight text-slate-500">
                    {entry.city_municipality && <div className="font-medium text-slate-700">{entry.city_municipality}</div>}
                    {entry.contact_number && <div>{entry.contact_number}</div>}
                    {!entry.city_municipality && !entry.contact_number && '—'}
                  </td>
                  <td className="px-4 py-2 border-r border-slate-100">{entry.classification_codes?.join(', ') || '—'}</td>
                  <td className="px-3 py-2 border-r border-slate-100 text-center font-semibold">{entry.age_group || '—'}</td>
                  <td className="px-3 py-2 border-r border-slate-100 text-center">{entry.highest_education ? EDUCATION_LEVELS.find(([v]) => v === entry.highest_education)?.[2] : '—'}</td>
                  <td className="px-4 py-2 border-r border-slate-100">
                    <Badge variant={STATUS_BADGE[entry.status] ?? 'neutral'} icon={false} className="py-0.5 text-[10px]">{statusLabel(entry.status)}</Badge>
                  </td>
                  <td className="px-4 py-2 border-r border-slate-100">{entry.mismatch_code || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={() => openEdit(index)} className="rounded p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => removeEntry(index)} className="rounded p-1.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors" title="Remove">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Button type="button" variant="outline" icon={Plus} onClick={openNew}>Add Applicant</Button>

      <Dialog open={draftIndex !== null} onOpenChange={(open) => { if (!open) closeModal() }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:rounded-3xl">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle>{draftIndex === 'new' ? 'Add applicant' : 'Edit applicant'}</DialogTitle>
              </DialogHeader>

              <div className="mt-2 grid gap-5 sm:grid-cols-2">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 sm:col-span-2">
                  Applicant name *
                  <div className="mt-2">
                    {searchApplicants ? (
                      <ApplicantNameSuggest
                        value={draft.applicant_name}
                        onChangeText={(text) => updateDraft({ applicant_name: text, seeker_id: null })}
                        onSelect={applyApplicantSuggestion}
                        searchFn={searchApplicants}
                      />
                    ) : (
                      <input value={draft.applicant_name} onChange={(e) => updateDraft({ applicant_name: e.target.value })} placeholder="Full name" className={`normal-case ${fieldClass}`} />
                    )}
                  </div>
                </label>

                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Position applied for *
                  <input value={draft.position_applied_for} onChange={(e) => updateDraft({ position_applied_for: e.target.value })} placeholder="Position" className={`mt-2 normal-case ${fieldClass}`} />
                </label>

                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Gender
                  <select value={draft.gender} onChange={(e) => updateDraft({ gender: e.target.value })} className={`mt-2 ${fieldClass}`}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </label>

                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  City / Municipality
                  <input value={draft.city_municipality} onChange={(e) => updateDraft({ city_municipality: e.target.value })} className={`mt-2 normal-case ${fieldClass}`} />
                </label>

                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Contact number
                  <input value={draft.contact_number} onChange={(e) => updateDraft({ contact_number: e.target.value })} className={`mt-2 normal-case ${fieldClass}`} />
                </label>

                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Age group
                  <select value={draft.age_group} onChange={(e) => updateDraft({ age_group: e.target.value })} className={`mt-2 ${fieldClass}`}>
                    <option value="">—</option>
                    {AGE_GROUPS.map(([code, label]) => <option key={code} value={code}>{code} · {label}</option>)}
                  </select>
                </label>

                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Highest education
                  <select value={draft.highest_education} onChange={(e) => updateDraft({ highest_education: e.target.value })} className={`mt-2 ${fieldClass}`}>
                    <option value="">—</option>
                    {EDUCATION_LEVELS.map(([value, label, code]) => <option key={value} value={value}>{code} · {label}</option>)}
                  </select>
                </label>

                <div className="sm:col-span-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Classification</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CLASSIFICATION_CODES.map(([code, label]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => toggleClassification(code)}
                        className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${draft.classification_codes.includes(code) ? 'border-brand-navy bg-brand-navy text-white shadow-md' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:shadow-sm'}`}
                      >
                        {code} · {label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Status of application
                  <select value={draft.status} onChange={(e) => updateDraft({ status: e.target.value })} className={`mt-2 ${fieldClass}`}>
                    {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>

                {MISMATCH_STATUSES.includes(draft.status) && (
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Reason for mismatch
                    <select value={draft.mismatch_code} onChange={(e) => updateDraft({ mismatch_code: e.target.value })} className={`mt-2 ${fieldClass}`}>
                      <option value="">—</option>
                      {mismatchOptionsFor(draft.status).map(([code, label]) => <option key={code} value={code}>{code} · {label}</option>)}
                    </select>
                  </label>
                )}

                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 sm:col-span-2">
                  Remarks
                  <input value={draft.remarks} onChange={(e) => updateDraft({ remarks: e.target.value })} className={`mt-2 normal-case ${fieldClass}`} />
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
                <Button variant="outline" onClick={closeModal}>Cancel</Button>
                <Button onClick={saveDraft} disabled={!canSave}>Save Applicant</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
