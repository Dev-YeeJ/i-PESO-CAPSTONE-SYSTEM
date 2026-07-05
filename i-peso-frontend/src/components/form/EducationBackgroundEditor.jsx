import { useId, useMemo, useState } from 'react'
import { BookOpen, Check, GraduationCap, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

const educationLevels = [
  { value: 'elementary_undergraduate', label: 'Elementary Undergraduate', backendLevel: 'elementary' },
  { value: 'elementary_graduate', label: 'Elementary Graduate', backendLevel: 'elementary' },
  { value: 'high_school_undergraduate', label: 'High School Undergraduate', backendLevel: 'secondary_non_k12' },
  { value: 'high_school_graduate', label: 'High School Graduate', backendLevel: 'secondary_non_k12' },
  { value: 'senior_high_undergraduate', label: 'Senior High School Undergraduate', backendLevel: 'senior_high_strand', requiresCourse: true },
  { value: 'senior_high_graduate', label: 'Senior High School Graduate', backendLevel: 'senior_high_strand', requiresCourse: true },
  { value: 'vocational', label: 'Vocational', backendLevel: 'vocational', requiresCourse: true },
  { value: 'college_undergraduate', label: 'College Undergraduate', backendLevel: 'tertiary', requiresCourse: true },
  { value: 'college_graduate', label: 'College Graduate', backendLevel: 'tertiary', requiresCourse: true },
  { value: 'post_graduate', label: 'Post-Graduate', backendLevel: 'graduate_studies', requiresCourse: true },
]

const educationStatuses = [
  { value: 'graduated', label: 'Graduated', help: 'Completed the school level, course, or program.' },
  { value: 'undergraduate', label: 'Undergraduate / Did Not Finish', help: 'Attended but did not complete this level or program.' },
  { value: 'currently_studying', label: 'Currently Studying', help: 'Currently enrolled and expected to complete later.' },
]

const schoolSuggestions = [
  'University of Pangasinan',
  'Pangasinan State University',
  'Urdaneta City University',
  'Lyceum-Northwestern University',
  'Colegio de Dagupan',
  'TESDA Provincial Training Center',
  'Polytechnic University of the Philippines',
  'University of the Philippines',
  'Technological University of the Philippines',
  'Rizal Technological University',
  'Taguig City University',
  'University of Makati',
  'Pamantasan ng Lungsod ng Maynila',
  'Philippine Normal University',
  'Bulacan State University',
  'Cavite State University',
  'Laguna State Polytechnic University',
  'TESDA Training Center',
]

const programSuggestions = [
  'Automotive Servicing NC II',
  'Bookkeeping NC III',
  'Bread and Pastry Production NC II',
  'Caregiving NC II',
  'Computer Systems Servicing NC II',
  'Contact Center Services NC II',
  'Cookery NC II',
  'Electrical Installation and Maintenance NC II',
  'Food and Beverage Services NC II',
  'Shielded Metal Arc Welding NC II',
  'Bachelor of Elementary Education',
  'Bachelor of Secondary Education',
  'Bachelor of Science in Accountancy',
  'Bachelor of Science in Business Administration',
  'Bachelor of Science in Computer Science',
  'Bachelor of Science in Criminology',
  'Bachelor of Science in Hospitality Management',
  'Bachelor of Science in Information Technology',
  'Bachelor of Science in Nursing',
  'Master in Business Administration',
  'Master in Public Administration',
  'Master of Arts in Education',
  'Doctor of Education',
  'Doctor of Philosophy',
  'Juris Doctor',
]

const blankEducation = {
  attainment_level: '',
  level: '',
  institution_name: '',
  course_strand: '',
  completion_status: '',
  year_started: '',
  year_graduated: '',
  expected_year_graduated: '',
  undergrad_year_last_attended: '',
  undergrad_level_reached: '',
}

const currentYear = new Date().getFullYear()
const pastYears = Array.from({ length: currentYear - 1949 }, (_, index) => currentYear - index)
const expectedYears = Array.from({ length: 16 }, (_, index) => currentYear + index)
const normalize = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()

export default function EducationBackgroundEditor({ form: controlledForm, errors = {}, onChange }) {
  const [localForm, setLocalForm] = useState({ educations: [] })
  const [draft, setDraft] = useState(blankEducation)
  const [editingIndex, setEditingIndex] = useState(null)
  const [draftErrors, setDraftErrors] = useState({})
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)

  const form = controlledForm ?? localForm
  const educations = form.educations ?? []
  const suggestedAttainment = inferEducationalAttainment(educations)
  const levelConfig = educationLevels.find((level) => level.value === draft.attainment_level)
  const showCourse = Boolean(levelConfig?.requiresCourse)
  const statusIsGraduated = draft.completion_status === 'graduated'
  const statusIsUndergraduate = draft.completion_status === 'undergraduate'
  const statusIsStudying = draft.completion_status === 'currently_studying'
  const availableStatuses = statusesForEducationLevel(draft.attainment_level)
  const cleanDraft = cleanEducation(draft)
  const readinessErrors = validateEducation(cleanDraft)
  const duplicateIndex = educations.findIndex((education, index) => (
    index !== editingIndex && educationKey(cleanDraft) === educationKey(cleanEducation(education))
  ))
  const duplicateMessage = duplicateIndex !== -1 && isMeaningfulEducation(cleanDraft)
    ? 'This school, level, course, and year range is already recorded.'
    : ''
  const canSaveDraft = Object.keys(readinessErrors).length === 0 && !duplicateMessage

  const emitChange = (event) => {
    if (onChange) {
      onChange(event)
      return
    }

    const { name, value } = event.target
    setLocalForm((current) => ({ ...current, [name]: value }))
  }

  const updateEducations = (nextEducations) => {
    emitChange({ target: { name: 'educations', value: nextEducations } })
  }

  const setDraftField = (name, value) => {
    setDraft((current) => {
      const next = { ...current, [name]: value }

      if (name === 'attainment_level') {
        const level = educationLevels.find((option) => option.value === value)
        next.level = level?.backendLevel ?? ''
        next.course_strand = ''
        next.completion_status = ''
        next.year_graduated = ''
        next.expected_year_graduated = ''
        next.undergrad_year_last_attended = ''
        next.undergrad_level_reached = ''
      }

      if (name === 'completion_status') {
        next.year_graduated = ''
        next.expected_year_graduated = ''
        next.undergrad_year_last_attended = ''
        next.undergrad_level_reached = ''
      }

      return next
    })
    setDraftErrors((current) => ({ ...current, [name]: undefined, duplicate: undefined }))
  }

  const resetDraft = () => {
    setDraft(blankEducation)
    setEditingIndex(null)
    setDraftErrors({})
    setAttemptedSubmit(false)
  }

  const startEdit = (education, index) => {
    setDraft(normalizeEducationForDraft(education))
    setEditingIndex(index)
    setDraftErrors({})
    setAttemptedSubmit(false)
  }

  const removeRecord = (index) => {
    const education = educations[index]
    const label = education.institution_name || labelForLevel(education) || 'this education record'
    if (!window.confirm(`Remove ${label} from your education records?`)) return
    updateEducations(educations.filter((_, itemIndex) => itemIndex !== index))
    if (editingIndex === index) {
      resetDraft()
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1)
    }
  }

  const saveDraft = () => {
    setAttemptedSubmit(true)

    const validationErrors = { ...readinessErrors }
    if (duplicateMessage) validationErrors.duplicate = duplicateMessage

    if (Object.keys(validationErrors).length) {
      setDraftErrors(validationErrors)
      return
    }

    if (editingIndex === null) {
      updateEducations([...educations, cleanDraft])
    } else {
      updateEducations(educations.map((education, index) => (index === editingIndex ? cleanDraft : education)))
    }

    resetDraft()
  }

  const baseVisibleErrors = attemptedSubmit ? { ...draftErrors, ...readinessErrors } : { ...draftErrors }
  const visibleErrors = duplicateMessage && (attemptedSubmit || !canSaveDraft)
    ? { ...baseVisibleErrors, duplicate: duplicateMessage }
    : baseVisibleErrors

  const savedRecordsSection = (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div>
          <h4 className="text-sm font-black text-slate-950">Saved Education Records</h4>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            {educations.length} record{educations.length === 1 ? '' : 's'} added
          </p>
        </div>
        {suggestedAttainment && (
          <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">
            Highest attainment: {suggestedAttainment}
          </span>
        )}
      </div>

      <div className="p-4 sm:p-5">
        {educations.length === 0 ? (
          <div className="flex items-start gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-slate-400 shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-800">No education records yet</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Add one school record below. This area will become your saved education list.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {educations.map((education, index) => (
              <EducationCard
                key={`${educationKey(cleanEducation(education))}-${index}`}
                education={cleanEducation(education)}
                onEdit={() => startEdit(education, index)}
                onRemove={() => removeRecord(index)}
              />
            ))}
          </div>
        )}
        {errors.educations && <p className="mt-3 text-xs font-semibold text-red-600">{errors.educations}</p>}
      </div>
    </section>
  )

  const formSection = (
    <section className="rounded-xl border border-blue-100 bg-slate-50 p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-800">Education record builder</p>
          <h4 className="mt-1 text-base font-black text-slate-950">
            {editingIndex === null ? 'Add Education Record' : 'Edit Education Record'}
          </h4>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Complete the required fields in order. Date fields change based on the education status you choose.
          </p>
        </div>
        {editingIndex !== null && (
          <button
            type="button"
            onClick={resetDraft}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          >
            <X className="h-3.5 w-3.5" /> Cancel edit
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Education Level" id="education-level" required error={visibleErrors.attainment_level || visibleErrors.level || errors['educations.*.level']}>
            <select
              id="education-level"
              value={draft.attainment_level}
              onChange={(event) => setDraftField('attainment_level', event.target.value)}
              className={controlClass(Boolean(visibleErrors.attainment_level || visibleErrors.level))}
              aria-invalid={Boolean(visibleErrors.attainment_level || visibleErrors.level)}
            >
              <option value="">Select education level</option>
              {educationLevels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
            </select>
          </Field>

          <SearchablePicker
            label="School Name"
            required
            value={draft.institution_name}
            options={schoolSuggestions}
            placeholder="Search school or training center"
            error={visibleErrors.institution_name}
            onChange={(value) => setDraftField('institution_name', value)}
          />
        </div>

        {showCourse && (
          <SearchablePicker
            label="Course / Degree / Strand"
            required
            value={draft.course_strand}
            options={programSuggestions}
            placeholder="Search course, degree, or TESDA qualification"
            error={visibleErrors.course_strand}
            onChange={(value) => setDraftField('course_strand', value)}
          />
        )}

        <Field label="Education Status" required error={visibleErrors.completion_status}>
          <div role="radiogroup" aria-label="Education Status" className="grid gap-3 sm:grid-cols-3">
            {availableStatuses.map((status) => {
              const active = draft.completion_status === status.value
              return (
                <button
                  key={status.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-pressed={active}
                  onClick={() => setDraftField('completion_status', status.value)}
                  className={`min-h-24 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                    active
                      ? 'border-blue-700 bg-blue-50 text-blue-950 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/60'
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-black">
                    <span className={`grid h-5 w-5 place-items-center rounded-full border ${active ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                      <Check className="h-3 w-3" />
                    </span>
                    {status.label}
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-slate-500">{status.help}</span>
                  {active && <span className="mt-2 inline-flex text-[11px] font-black text-blue-800">Selected</span>}
                </button>
              )
            })}
          </div>
        </Field>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Year Started" id="year-started" required error={visibleErrors.year_started}>
            <YearSelect
              id="year-started"
              value={draft.year_started}
              years={pastYears}
              error={visibleErrors.year_started}
              onChange={(value) => setDraftField('year_started', value)}
            />
          </Field>

          {statusIsGraduated && (
            <Field label="Year Graduated" id="year-graduated" required error={visibleErrors.year_graduated}>
              <YearSelect
                id="year-graduated"
                value={draft.year_graduated}
                years={pastYears}
                error={visibleErrors.year_graduated}
                onChange={(value) => setDraftField('year_graduated', value)}
              />
            </Field>
          )}

          {statusIsStudying && (
            <Field label="Expected Year Graduated" id="expected-year-graduated" required error={visibleErrors.expected_year_graduated}>
              <YearSelect
                id="expected-year-graduated"
                value={draft.expected_year_graduated}
                years={expectedYears}
                error={visibleErrors.expected_year_graduated}
                onChange={(value) => setDraftField('expected_year_graduated', value)}
              />
            </Field>
          )}

          {statusIsUndergraduate && (
            <Field label="Year Last Attended" id="year-last-attended" required error={visibleErrors.undergrad_year_last_attended}>
              <YearSelect
                id="year-last-attended"
                value={draft.undergrad_year_last_attended}
                years={pastYears}
                error={visibleErrors.undergrad_year_last_attended}
                onChange={(value) => setDraftField('undergrad_year_last_attended', value)}
              />
            </Field>
          )}
        </div>

        {visibleErrors.duplicate && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {visibleErrors.duplicate}
          </p>
        )}

        <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">
            {canSaveDraft
              ? 'Ready to add this education record.'
              : 'Complete all required fields to enable the add button.'}
          </p>
          <button
            type="button"
            onClick={saveDraft}
            disabled={!canSaveDraft}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 sm:w-auto"
          >
            {editingIndex === null ? <Plus className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {editingIndex === null ? 'Add Education Record' : 'Save Education Record'}
          </button>
        </div>
      </div>
    </section>
  )

  return (
    <div className="space-y-5">
      {educations.length === 0 ? (
        <>
          {formSection}
          {savedRecordsSection}
        </>
      ) : (
        <>
          {savedRecordsSection}
          {formSection}
        </>
      )}
    </div>
  )
}

function SearchablePicker({ label, required = false, value, options, placeholder, error, onChange }) {
  const inputId = useId()
  const listboxId = useId()
  const [focused, setFocused] = useState(false)
  const query = value || ''
  const normalizedQuery = normalize(query)
  const matches = useMemo(() => (
    options
      .filter((option) => !normalizedQuery || normalize(option).includes(normalizedQuery))
      .slice(0, normalizedQuery ? 8 : 6)
  ), [options, normalizedQuery])

  const choose = (nextValue) => {
    onChange(nextValue)
    setFocused(false)
  }

  return (
    <Field label={label} id={inputId} required={required} error={error}>
      <div className="relative z-20">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id={inputId}
          value={query}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onChange={(event) => onChange(event.target.value)}
          className={`${controlClass(Boolean(error))} pl-9`}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={focused}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-invalid={Boolean(error)}
        />
        {focused && (
          <div
            id={listboxId}
            role="listbox"
            className="absolute inset-x-0 top-full z-[80] mt-2 max-h-64 min-w-full overflow-x-hidden overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white py-1 shadow-2xl"
          >
            {matches.length > 0 ? (
              matches.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={normalize(value) === normalize(option)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                  title={option}
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm font-semibold leading-5 text-slate-700 transition hover:bg-blue-50 focus-visible:bg-blue-50 focus-visible:outline-none"
                >
                  <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="min-w-0 whitespace-normal break-words">{option}</span>
                </button>
              ))
            ) : (
              <div className="whitespace-normal break-words px-3 py-3 text-xs leading-5 text-slate-500">
                No matching school found. You can continue typing to enter the school name manually.
              </div>
            )}
          </div>
        )}
      </div>
    </Field>
  )
}

function EducationCard({ education, onEdit, onRemove }) {
  const statusLabel = statusesForEducationLevel(education.attainment_level || inferAttainmentLevel(education))
    .find((status) => status.value === education.completion_status)?.label
    || (education.year_graduated ? 'Graduated' : 'Undergraduate / Did Not Finish')
  const program = education.course_strand || null
  const endYear = education.year_graduated
    || education.undergrad_year_last_attended
    || education.expected_year_graduated
    || (education.completion_status === 'currently_studying' ? 'Present' : null)
  const yearRange = [education.year_started, endYear].filter(Boolean).join(' - ')

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950">{education.institution_name || 'School not specified'}</p>
          <p className="mt-1 text-xs font-bold text-blue-700">{labelForLevel(education)}</p>
          {program && <p className="mt-1 text-sm leading-5 text-slate-600">{program}</p>}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{statusLabel}</span>
            {yearRange && <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">{yearRange}</span>}
            {education.expected_year_graduated && education.completion_status === 'currently_studying' && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">Expected {education.expected_year_graduated}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            aria-label="Edit education record"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
            aria-label="Remove education record"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      </div>
    </article>
  )
}

function Field({ label, id, required = false, error, children }) {
  const labelContent = (
    <>
      {label}
      {required && <span className="ml-1 text-red-600">*</span>}
    </>
  )

  return (
    <div className="block">
      {id ? (
        <label htmlFor={id} className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-600">
          {labelContent}
        </label>
      ) : (
        <p className="mb-1.5 text-xs font-black uppercase tracking-wide text-slate-600">{labelContent}</p>
      )}
      {children}
      {error && <span className="mt-1.5 block text-xs font-semibold text-red-600">{Array.isArray(error) ? error[0] : error}</span>}
    </div>
  )
}

function YearSelect({ id, value, years, error, onChange }) {
  return (
    <select
      id={id}
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      className={controlClass(Boolean(error))}
      aria-invalid={Boolean(error)}
    >
      <option value="">Select year</option>
      {years.map((year) => <option key={year} value={year}>{year}</option>)}
    </select>
  )
}

function controlClass(hasError = false) {
  return [
    'h-11 w-full rounded-lg border bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400',
    'focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15',
    hasError ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-slate-300',
  ].join(' ')
}

function validateEducation(education) {
  const errors = {}
  const startYear = Number(education.year_started)
  const graduatedYear = Number(education.year_graduated)
  const expectedYear = Number(education.expected_year_graduated)
  const lastAttendedYear = Number(education.undergrad_year_last_attended)

  if (!education.attainment_level) errors.attainment_level = 'Education level is required.'
  if (!education.level) errors.level = 'Education level is required.'
  if (!education.institution_name) errors.institution_name = 'School name is required.'
  if (!education.completion_status) errors.completion_status = 'Choose an education status.'
  if (
    education.completion_status
    && !statusesForEducationLevel(education.attainment_level).some((status) => status.value === education.completion_status)
  ) {
    errors.completion_status = 'Choose a status that matches the selected education level.'
  }
  if (!education.year_started) errors.year_started = 'Year started is required.'
  if (education.year_started && (startYear < 1950 || startYear > currentYear)) errors.year_started = 'Select a valid year.'

  if (requiresCourse(education) && !education.course_strand) {
    errors.course_strand = 'Course or degree is required for this education level.'
  }

  if (education.completion_status === 'graduated') {
    if (!education.year_graduated) errors.year_graduated = 'Year graduated is required.'
    if (education.year_graduated && graduatedYear < startYear) errors.year_graduated = 'Year graduated cannot be earlier than year started.'
    if (education.year_graduated && graduatedYear > currentYear) errors.year_graduated = 'Year graduated cannot be in the future.'
  }

  if (education.completion_status === 'undergraduate') {
    if (!education.undergrad_year_last_attended) errors.undergrad_year_last_attended = 'Year last attended is required.'
    if (education.undergrad_year_last_attended && lastAttendedYear < startYear) errors.undergrad_year_last_attended = 'Year last attended cannot be earlier than year started.'
    if (education.undergrad_year_last_attended && lastAttendedYear > currentYear) errors.undergrad_year_last_attended = 'Year last attended cannot be in the future.'
  }

  if (education.completion_status === 'currently_studying') {
    if (!education.expected_year_graduated) errors.expected_year_graduated = 'Expected year graduated is required.'
    if (education.expected_year_graduated && expectedYear < startYear) errors.expected_year_graduated = 'Expected year cannot be earlier than year started.'
    if (education.expected_year_graduated && expectedYear < currentYear) errors.expected_year_graduated = 'Expected year should not be in the past.'
  }

  return errors
}

function statusesForEducationLevel(attainmentLevel) {
  if (['elementary_undergraduate', 'high_school_undergraduate', 'senior_high_undergraduate', 'college_undergraduate'].includes(attainmentLevel)) {
    return [
      { value: 'currently_studying', label: 'Currently Studying', help: 'Currently enrolled and expected to complete later.' },
      { value: 'undergraduate', label: attainmentLevel === 'college_undergraduate' ? 'Completed Units / Did Not Finish' : 'Did Not Finish', help: 'Attended this level but did not graduate.' },
    ]
  }

  if (attainmentLevel === 'vocational') {
    return [
      { value: 'graduated', label: 'Completed', help: 'Completed the vocational or technical program.' },
      { value: 'currently_studying', label: 'Currently Studying', help: 'Currently enrolled and expected to complete later.' },
      { value: 'undergraduate', label: 'Did Not Finish', help: 'Attended but did not complete the program.' },
    ]
  }

  if (['elementary_graduate', 'high_school_graduate', 'senior_high_graduate', 'college_graduate'].includes(attainmentLevel)) {
    return [{ value: 'graduated', label: 'Graduated', help: 'Completed this education level.' }]
  }

  return educationStatuses
}

function cleanEducation(education) {
  const attainmentLevel = education.attainment_level || inferAttainmentLevel(education)
  const levelConfig = educationLevels.find((level) => level.value === attainmentLevel)
  const level = levelConfig?.backendLevel || normalizeBackendLevel(education.level)
  const status = education.completion_status || (education.year_graduated ? 'graduated' : '')

  return {
    attainment_level: attainmentLevel,
    level,
    institution_name: String(education.institution_name ?? '').trim().replace(/\s+/g, ' '),
    course_strand: requiresCourse({ attainment_level: attainmentLevel, level }) ? String(education.course_strand ?? '').trim().replace(/\s+/g, ' ') : '',
    completion_status: status,
    year_started: education.year_started || '',
    year_graduated: status === 'graduated' ? (education.year_graduated || '') : '',
    expected_year_graduated: status === 'currently_studying' ? (education.expected_year_graduated || '') : '',
    undergrad_year_last_attended: status === 'undergraduate' ? (education.undergrad_year_last_attended || '') : '',
    undergrad_level_reached: status === 'undergraduate'
      ? (education.undergrad_level_reached || levelConfig?.label || labelForLevel({ attainment_level: attainmentLevel, level }))
      : '',
  }
}

function normalizeEducationForDraft(education) {
  return { ...blankEducation, ...cleanEducation(education) }
}

function educationKey(education) {
  const endYear = education.year_graduated
    || education.undergrad_year_last_attended
    || education.expected_year_graduated
    || (education.completion_status === 'currently_studying' ? 'present' : '')
  return [
    normalize(education.institution_name),
    normalize(education.attainment_level || education.level),
    normalize(education.course_strand),
    education.year_started || '',
    endYear,
  ].join('|')
}

function isMeaningfulEducation(education) {
  return Boolean(
    education.attainment_level
    && education.institution_name
    && education.completion_status
    && education.year_started
  )
}

function requiresCourse(education) {
  const value = education.attainment_level || inferAttainmentLevel(education)
  const config = educationLevels.find((level) => level.value === value)
  return Boolean(config?.requiresCourse)
}

function normalizeBackendLevel(value) {
  if (value === 'senior_high') return 'senior_high_strand'
  if (value === 'graduate') return 'graduate_studies'
  if (value === 'post_graduate') return 'graduate_studies'
  return value || ''
}

function inferAttainmentLevel(education) {
  if (education.attainment_level) return education.attainment_level
  const level = normalizeBackendLevel(education.level)
  const status = education.completion_status || (education.year_graduated ? 'graduated' : '')

  if (level === 'elementary') return status === 'graduated' ? 'elementary_graduate' : 'elementary_undergraduate'
  if (level === 'vocational') return 'vocational'
  if (level === 'graduate_studies') return 'post_graduate'
  if (level === 'tertiary') return status === 'graduated' ? 'college_graduate' : 'college_undergraduate'
  if (level === 'senior_high_strand') return status === 'graduated' ? 'senior_high_graduate' : 'senior_high_undergraduate'
  if (level === 'secondary_non_k12' || level === 'secondary_k12') {
    return status === 'graduated' ? 'high_school_graduate' : 'high_school_undergraduate'
  }

  return ''
}

function labelForLevel(education) {
  const value = education.attainment_level || inferAttainmentLevel(education)
  return educationLevels.find((level) => level.value === value)?.label || 'Education level not specified'
}

function inferEducationalAttainment(educations = []) {
  const ranks = {
    'Elementary Undergraduate': 1,
    'Elementary Graduate': 2,
    'High School Undergraduate': 3,
    'High School Graduate': 4,
    'Senior High School Undergraduate': 5,
    'Senior High School Graduate': 6,
    'Vocational / Technical': 7,
    'College Undergraduate': 8,
    'College Graduate': 9,
    'Post-Graduate': 10,
  }

  const inferred = educations
    .map((education) => {
      const clean = cleanEducation(education)
      const isGraduated = clean.completion_status === 'graduated'

      switch (clean.attainment_level) {
        case 'high_school_undergraduate':
          return 'High School Undergraduate'
        case 'high_school_graduate':
          return isGraduated ? 'High School Graduate' : 'High School Undergraduate'
        case 'vocational':
          return 'Vocational / Technical'
        case 'college_undergraduate':
          return 'College Undergraduate'
        case 'college_graduate':
          return isGraduated ? 'College Graduate' : 'College Undergraduate'
        case 'post_graduate':
          return 'Post-Graduate'
        default:
          return null
      }
    })
    .filter(Boolean)

  return inferred.sort((left, right) => (ranks[right] || 0) - (ranks[left] || 0))[0] || ''
}
