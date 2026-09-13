import { useState } from 'react'
import { Pencil, Plus, Trash2, UserRoundPlus } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import ApplicantNameSuggest from './ApplicantNameSuggest'
import {
  AGE_GROUPS, CLASSIFICATION_CODES, EDUCATION_LEVELS, EMPLOYER_MISMATCH_CODES,
  SEEKER_MISMATCH_CODES, STATUS_OPTIONS, blankResultEntry, statusLabel,
} from './jobFairResultVocab'

const MISMATCH_STATUSES = ['employer_mismatch', 'seeker_mismatch']
const STATUS_BADGE = { qualified: 'review', near_hired: 'review', hots: 'verified', employer_mismatch: 'rejected', seeker_mismatch: 'rejected' }
const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/10'

/**
 * Per-applicant register editor for a RO1-JF Form 3 result report — shared by
 * the employer self-service "Post-Event Results" tab and the admin proxy
 * "Paper encoding" tab so both produce the exact same entry shape.
 *
 * Applicants render as a compact scannable card list; "Add Applicant" and
 * each card's "Edit" open a single shared modal with all 10 (11, counting
 * remarks) fields laid out for easy typing, rather than a 10-column table
 * where every cell is a cramped inline control.
 *
 * @param {(query: string, signal: AbortSignal) => Promise<object[]>} [searchApplicants]
 *   Optional — when provided, the applicant-name field becomes a "smart
 *   typing" search that auto-fills the rest of the entry from a matched job
 *   seeker's profile. Omitted, it falls back to a bare text input.
 */
export default function JobFairResultEntryEditor({ entries, onChange, searchApplicants }) {
  const [draftIndex, setDraftIndex] = useState(null) // array index being edited, 'new', or null (modal closed)
  const [draft, setDraft] = useState(null)

  // A seeker picked twice in the same report is very plausibly a mistake —
  // flagged, not blocked, since an employer might genuinely see the same
  // person twice for two different positions.
  const duplicateSeekerIds = new Set(
    entries.map((row) => row.seeker_id).filter((id, index, all) => id && all.indexOf(id) !== index),
  )

  const openNew = () => { setDraft(blankResultEntry()); setDraftIndex('new') }
  const openEdit = (index) => { setDraft({ ...entries[index] }); setDraftIndex(index) }
  const closeModal = () => { setDraft(null); setDraftIndex(null) }
  const removeEntry = (index) => onChange(entries.filter((_, i) => i !== index))

  const canSave = Boolean(draft?.applicant_name && draft?.position_applied_for)
  const saveDraft = () => {
    if (!canSave) return
    onChange(draftIndex === 'new' ? [...entries, draft] : entries.map((row, i) => (i === draftIndex ? draft : row)))
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
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <UserRoundPlus className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-medium text-slate-500">No applicants added yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <div key={index} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-slate-900">{entry.applicant_name || 'Unnamed applicant'}</p>
                  <Badge status={STATUS_BADGE[entry.status] ?? 'neutral'} icon={false}>{statusLabel(entry.status)}</Badge>
                  {entry.seeker_id && duplicateSeekerIds.has(entry.seeker_id) && <Badge status="warning">Duplicate</Badge>}
                </div>
                <p className="mt-1 text-sm text-slate-500">{entry.position_applied_for || 'No position specified'}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                  {entry.city_municipality && <span>{entry.city_municipality}</span>}
                  {entry.contact_number && <span>{entry.contact_number}</span>}
                  {entry.age_group && <span>Age {AGE_GROUPS.find(([code]) => code === entry.age_group)?.[1]}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button type="button" variant="outline" size="sm" icon={Pencil} onClick={() => openEdit(index)}>Edit</Button>
                <button type="button" onClick={() => removeEntry(index)} aria-label="Remove applicant" className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" icon={Plus} onClick={openNew}>Add Applicant</Button>

      <Dialog open={draftIndex !== null} onOpenChange={(open) => { if (!open) closeModal() }}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle>{draftIndex === 'new' ? 'Add applicant' : 'Edit applicant'}</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 sm:col-span-2">
                  Applicant name *
                  <div className="mt-1.5">
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

                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Position applied for *
                  <input value={draft.position_applied_for} onChange={(e) => updateDraft({ position_applied_for: e.target.value })} placeholder="Position" className={`mt-1.5 normal-case ${fieldClass}`} />
                </label>

                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Gender
                  <select value={draft.gender} onChange={(e) => updateDraft({ gender: e.target.value })} className={`mt-1.5 ${fieldClass}`}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </label>

                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  City / Municipality
                  <input value={draft.city_municipality} onChange={(e) => updateDraft({ city_municipality: e.target.value })} className={`mt-1.5 normal-case ${fieldClass}`} />
                </label>

                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Contact number
                  <input value={draft.contact_number} onChange={(e) => updateDraft({ contact_number: e.target.value })} className={`mt-1.5 normal-case ${fieldClass}`} />
                </label>

                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Age group
                  <select value={draft.age_group} onChange={(e) => updateDraft({ age_group: e.target.value })} className={`mt-1.5 ${fieldClass}`}>
                    <option value="">—</option>
                    {AGE_GROUPS.map(([code, label]) => <option key={code} value={code}>{code} · {label}</option>)}
                  </select>
                </label>

                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Highest education
                  <select value={draft.highest_education} onChange={(e) => updateDraft({ highest_education: e.target.value })} className={`mt-1.5 ${fieldClass}`}>
                    <option value="">—</option>
                    {EDUCATION_LEVELS.map(([value, label, code]) => <option key={value} value={value}>{code} · {label}</option>)}
                  </select>
                </label>

                <div className="sm:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Classification</p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {CLASSIFICATION_CODES.map(([code, label]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => toggleClassification(code)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${draft.classification_codes.includes(code) ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'}`}
                      >
                        {code} · {label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Status of application
                  <select value={draft.status} onChange={(e) => updateDraft({ status: e.target.value })} className={`mt-1.5 ${fieldClass}`}>
                    {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>

                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Mismatch reason
                  <select disabled={!MISMATCH_STATUSES.includes(draft.status)} value={draft.mismatch_code} onChange={(e) => updateDraft({ mismatch_code: e.target.value })} className={`mt-1.5 ${fieldClass} disabled:opacity-40`}>
                    <option value="">—</option>
                    {mismatchOptionsFor(draft.status).map(([code, label]) => <option key={code} value={code}>({code}) {label}</option>)}
                  </select>
                </label>

                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 sm:col-span-2">
                  Remarks (optional)
                  <textarea value={draft.remarks} onChange={(e) => updateDraft({ remarks: e.target.value })} rows={2} className={`mt-1.5 resize-none normal-case ${fieldClass}`} />
                </label>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                <Button type="button" onClick={saveDraft} disabled={!canSave}>{draftIndex === 'new' ? 'Add applicant' : 'Save changes'}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
