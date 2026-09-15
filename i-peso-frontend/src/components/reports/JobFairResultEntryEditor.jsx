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
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <div key={fields[index]?.id || index} className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-slate-900">{entry.applicant_name || 'Unnamed applicant'}</p>
                  <Badge variant={STATUS_BADGE[entry.status] ?? 'neutral'} icon={false}>{statusLabel(entry.status)}</Badge>
                  {entry.seeker_id && duplicateSeekerIds.has(entry.seeker_id) && <Badge variant="warning">Duplicate</Badge>}
                </div>
                <p className="mt-1 text-sm font-medium text-slate-600">{entry.position_applied_for || 'No position specified'}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {entry.city_municipality && <span>{entry.city_municipality}</span>}
                  {entry.contact_number && <span>{entry.contact_number}</span>}
                  {entry.age_group && <span>Age {AGE_GROUPS.find(([code]) => code === entry.age_group)?.[1]}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                <Button type="button" variant="outline" size="sm" icon={Pencil} onClick={() => openEdit(index)} className="h-8 text-xs">Edit</Button>
                <button type="button" onClick={() => removeEntry(index)} aria-label="Remove applicant" className="rounded-xl bg-slate-50 p-2 text-slate-400 transition-colors hover:bg-rose-100 hover:text-rose-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
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
