import { useMemo, useState } from 'react'
import { Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

const educationLevels = [
  { value: 'elementary', label: 'Elementary' },
  { value: 'secondary_non_k12', label: 'Secondary / Junior High School Non-K-12' },
  { value: 'secondary_k12', label: 'Secondary / Junior High School K-12' },
  { value: 'senior_high_strand', label: 'Senior High School' },
  { value: 'tertiary', label: 'Tertiary / College' },
  { value: 'graduate_studies', label: 'Graduate Studies / Post-graduate' },
]

const educationStatuses = [
  { value: 'graduated', label: 'Graduated' },
  { value: 'undergraduate', label: 'Undergraduate / Did Not Finish' },
  { value: 'currently_studying', label: 'Currently Studying' },
]

const strands = [
  'STEM',
  'ABM',
  'HUMSS',
  'GAS',
  'ICT',
  'Home Economics',
  'Industrial Arts',
  'Agri-Fishery Arts',
  'Sports',
  'Arts and Design',
]

const schoolSuggestions = [
  'Abra State Institute of Sciences and Technology',
  'Adamson University',
  'Ateneo de Manila University',
  'Baguio City National High School',
  'Bulacan State University',
  'Cavite State University',
  'Central Luzon State University',
  'De La Salle University',
  'Don Bosco Technical Institute',
  'Far Eastern University',
  'Laguna State Polytechnic University',
  'Mapua University',
  'Mindanao State University',
  'National University',
  'Pangasinan State University',
  'Philippine Normal University',
  'Polytechnic University of the Philippines',
  'Rizal Technological University',
  'STI College',
  'Taguig City University',
  'Technological Institute of the Philippines',
  'Technological University of the Philippines',
  'TESDA Training Center',
  'University of Caloocan City',
  'University of Makati',
  'University of Manila',
  'University of Perpetual Help System',
  'University of Rizal System',
  'University of Santo Tomas',
  'University of the East',
  'University of the Philippines',
]

const collegePrograms = [
  'Bachelor of Elementary Education',
  'Bachelor of Secondary Education',
  'Bachelor of Science in Accountancy',
  'Bachelor of Science in Agriculture',
  'Bachelor of Science in Architecture',
  'Bachelor of Science in Business Administration',
  'Bachelor of Science in Civil Engineering',
  'Bachelor of Science in Computer Engineering',
  'Bachelor of Science in Computer Science',
  'Bachelor of Science in Criminology',
  'Bachelor of Science in Electrical Engineering',
  'Bachelor of Science in Electronics Engineering',
  'Bachelor of Science in Entrepreneurship',
  'Bachelor of Science in Hospitality Management',
  'Bachelor of Science in Information Systems',
  'Bachelor of Science in Information Technology',
  'Bachelor of Science in Mechanical Engineering',
  'Bachelor of Science in Nursing',
  'Bachelor of Science in Office Administration',
  'Bachelor of Science in Psychology',
  'Bachelor of Science in Tourism Management',
]

const graduatePrograms = [
  'Doctor of Education',
  'Doctor of Philosophy',
  'Juris Doctor',
  'Master in Business Administration',
  'Master in Public Administration',
  'Master of Arts in Education',
  'Master of Engineering',
  'Master of Information Technology',
  'Master of Public Health',
  'Master of Science in Computer Science',
  'Master of Science in Information Technology',
  'Master of Science in Nursing',
]

const levelOptions = {
  elementary: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
  secondary_non_k12: ['1st Year High School', '2nd Year High School', '3rd Year High School', '4th Year High School'],
  secondary_k12: ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
  senior_high_strand: ['Grade 11', 'Grade 12'],
  tertiary: ['1st Year College', '2nd Year College', '3rd Year College', '4th Year College', '5th Year College', '6th Year College'],
  graduate_studies: ['1st Year Graduate Studies', '2nd Year Graduate Studies', 'Completed Coursework', 'Thesis / Dissertation Stage'],
}

const blankEducation = {
  level: '',
  institution_name: '',
  course_strand: '',
  completion_status: '',
  year_started: '',
  year_graduated: '',
  undergrad_level_reached: '',
  undergrad_year_last_attended: '',
  current_level: '',
}

const normalize = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
const currentYear = new Date().getFullYear()
const years = Array.from({ length: currentYear - 1949 }, (_, index) => currentYear - index)

export default function EducationBackgroundEditor({ form, errors, onChange }) {
  const [draft, setDraft] = useState(blankEducation)
  const [editingIndex, setEditingIndex] = useState(null)
  const [draftErrors, setDraftErrors] = useState({})

  const educations = form.educations ?? []
  const suggestedAttainment = inferEducationalAttainment(educations)

  const updateEducations = (nextEducations) => {
    onChange({ target: { name: 'educations', value: nextEducations } })
  }

  const setDraftField = (name, value) => {
    setDraft((current) => {
      const next = { ...current, [name]: value }

      if (name === 'level') {
        next.course_strand = ''
        next.undergrad_level_reached = ''
        next.current_level = ''
      }

      if (name === 'completion_status') {
        next.year_graduated = ''
        next.undergrad_level_reached = ''
        next.undergrad_year_last_attended = ''
        next.current_level = ''
      }

      return next
    })
    setDraftErrors((current) => ({ ...current, [name]: undefined, duplicate: undefined }))
  }

  const resetDraft = () => {
    setDraft(blankEducation)
    setEditingIndex(null)
    setDraftErrors({})
  }

  const startEdit = (education, index) => {
    setDraft(normalizeEducationForDraft(education))
    setEditingIndex(index)
    setDraftErrors({})
  }

  const removeRecord = (index) => {
    const education = educations[index]
    const label = education.institution_name || labelForLevel(education.level) || 'this education record'
    if (!window.confirm(`Remove ${label} from your education records?`)) return
    updateEducations(educations.filter((_, itemIndex) => itemIndex !== index))
    if (editingIndex === index) resetDraft()
  }

  const saveDraft = () => {
    const clean = cleanEducation(draft)
    const validationErrors = validateEducation(clean)
    const duplicateIndex = educations.findIndex((education, index) => (
      index !== editingIndex && educationKey(clean) === educationKey(cleanEducation(education))
    ))

    if (duplicateIndex !== -1) {
      validationErrors.duplicate = 'This school, level, program, and year range is already recorded.'
    }

    if (Object.keys(validationErrors).length) {
      setDraftErrors(validationErrors)
      return
    }

    if (editingIndex === null) {
      updateEducations([...educations, clean])
    } else {
      updateEducations(educations.map((education, index) => (index === editingIndex ? clean : education)))
    }

    resetDraft()
  }

  const programMode = programModeForLevel(draft.level)
  const statusIsGraduated = draft.completion_status === 'graduated'
  const statusIsUndergraduate = draft.completion_status === 'undergraduate'
  const statusIsStudying = draft.completion_status === 'currently_studying'

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-sm font-bold text-slate-900">Currently in school?</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            { value: true, label: 'Yes' },
            { value: false, label: 'No' },
          ].map((option) => {
            const active = Boolean(form.currently_in_school) === option.value
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => onChange({ target: { name: 'currently_in_school', value: option.value } })}
                className={`rounded-lg border px-4 py-3 text-left text-sm font-semibold transition ${
                  active
                    ? 'border-blue-700 bg-white text-blue-800 shadow-sm'
                    : 'border-blue-100 bg-blue-50 text-slate-600 hover:bg-white'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-950">{editingIndex === null ? 'Add Education Record' : 'Edit Education Record'}</h4>
            {suggestedAttainment && (
              <p className="mt-1 text-xs text-slate-500">Highest attainment will be saved as {suggestedAttainment}.</p>
            )}
          </div>
          {editingIndex !== null && (
            <button type="button" onClick={resetDraft} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Education Level" error={draftErrors.level || errors['educations.*.level']}>
              <select value={draft.level} onChange={(event) => setDraftField('level', event.target.value)} className="portal-input">
                <option value="">Select level</option>
                {educationLevels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
              </select>
            </Field>

            <Field label="Education Status" error={draftErrors.completion_status}>
              <div className="grid gap-2 sm:grid-cols-3">
                {educationStatuses.map((status) => {
                  const active = draft.completion_status === status.value
                  return (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() => setDraftField('completion_status', status.value)}
                      className={`min-h-11 rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${
                        active
                          ? 'border-blue-700 bg-blue-50 text-blue-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {status.label}
                    </button>
                  )
                })}
              </div>
            </Field>
          </div>

          <SearchablePicker
            label="School Name"
            value={draft.institution_name}
            options={schoolSuggestions}
            placeholder="Search school"
            error={draftErrors.institution_name}
            onChange={(value) => setDraftField('institution_name', value)}
          />

          {programMode === 'strand' && (
            <Field label="Strand" error={draftErrors.course_strand}>
              <select value={draft.course_strand} onChange={(event) => setDraftField('course_strand', event.target.value)} className="portal-input">
                <option value="">Select strand</option>
                {strands.map((strand) => <option key={strand} value={strand}>{strand}</option>)}
              </select>
            </Field>
          )}

          {programMode === 'college' && (
            <SearchablePicker
              label="Course / Program"
              value={draft.course_strand}
              options={collegePrograms}
              placeholder="Search course or program"
              error={draftErrors.course_strand}
              onChange={(value) => setDraftField('course_strand', value)}
            />
          )}

          {programMode === 'graduate' && (
            <SearchablePicker
              label="Graduate Program"
              value={draft.course_strand}
              options={graduatePrograms}
              placeholder="Search graduate program"
              error={draftErrors.course_strand}
              onChange={(value) => setDraftField('course_strand', value)}
            />
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Year Started" error={draftErrors.year_started}>
              <YearSelect value={draft.year_started} onChange={(value) => setDraftField('year_started', value)} />
            </Field>

            {statusIsGraduated && (
              <Field label="Year Graduated" error={draftErrors.year_graduated}>
                <YearSelect value={draft.year_graduated} onChange={(value) => setDraftField('year_graduated', value)} />
              </Field>
            )}

            {statusIsUndergraduate && (
              <>
                <Field label="Level Reached" error={draftErrors.undergrad_level_reached}>
                  <LevelSelect level={draft.level} value={draft.undergrad_level_reached} onChange={(value) => setDraftField('undergrad_level_reached', value)} />
                </Field>
                <Field label="Year Last Attended" error={draftErrors.undergrad_year_last_attended}>
                  <YearSelect value={draft.undergrad_year_last_attended} onChange={(value) => setDraftField('undergrad_year_last_attended', value)} />
                </Field>
              </>
            )}

            {statusIsStudying && (
              <Field label="Current Level" error={draftErrors.current_level}>
                <LevelSelect level={draft.level} value={draft.current_level} onChange={(value) => setDraftField('current_level', value)} />
              </Field>
            )}
          </div>

          {draftErrors.duplicate && <p className="text-xs font-semibold text-red-600">{draftErrors.duplicate}</p>}

          <button
            type="button"
            onClick={saveDraft}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-800 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-900 sm:w-auto"
          >
            {editingIndex === null ? <Plus className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {editingIndex === null ? 'Add Education Record' : 'Save Education Record'}
          </button>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-950">Saved Education Records</h4>
            <p className="mt-1 text-xs text-slate-500">{educations.length} record{educations.length === 1 ? '' : 's'} added</p>
          </div>
        </div>

        {educations.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No education records yet.
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
        {errors.educations && <p className="mt-2 text-xs font-semibold text-red-600">{errors.educations}</p>}
      </section>
    </div>
  )
}

function SearchablePicker({ label, value, options, placeholder, error, onChange }) {
  const [query, setQuery] = useState(value || '')
  const exactMatch = options.some((option) => normalize(option) === normalize(query))
  const matches = useMemo(() => (
    options
      .filter((option) => normalize(option).includes(normalize(query)))
      .slice(0, query ? 8 : 6)
  ), [options, query])

  const choose = (nextValue) => {
    setQuery(nextValue)
    onChange(nextValue)
  }

  return (
    <Field label={label} error={error}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            if (exactMatch) onChange(event.target.value)
          }}
          className="portal-input pl-9"
          placeholder={placeholder}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {matches.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => choose(option)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              normalize(value) === normalize(option)
                ? 'border-blue-700 bg-blue-50 text-blue-800'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {option}
          </button>
        ))}
        {query.trim() && !exactMatch && (
          <button type="button" onClick={() => choose(query.trim())} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
            Use "{query.trim()}"
          </button>
        )}
      </div>
    </Field>
  )
}

function EducationCard({ education, onEdit, onRemove }) {
  const statusLabel = educationStatuses.find((status) => status.value === education.completion_status)?.label
    || (education.year_graduated ? 'Graduated' : 'Undergraduate / Did Not Finish')
  const program = education.course_strand || null
  const yearRange = [
    education.year_started,
    education.year_graduated || education.undergrad_year_last_attended || (education.completion_status === 'currently_studying' ? 'Present' : null),
  ].filter(Boolean).join(' - ')

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-950">{education.institution_name || 'School not specified'}</p>
          <p className="mt-1 text-xs font-semibold text-blue-700">{labelForLevel(education.level)}</p>
          {program && <p className="mt-1 text-sm text-slate-600">{program}</p>}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{statusLabel}</span>
            {yearRange && <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">{yearRange}</span>}
            {education.undergrad_level_reached && <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">{education.undergrad_level_reached}</span>}
            {education.current_level && <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">{education.current_level}</span>}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button type="button" onClick={onRemove} className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100">
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      </div>
    </article>
  )
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-xs font-semibold text-red-600">{Array.isArray(error) ? error[0] : error}</span>}
    </label>
  )
}

function YearSelect({ value, onChange }) {
  return (
    <select value={value || ''} onChange={(event) => onChange(event.target.value)} className="portal-input">
      <option value="">Select year</option>
      {years.map((year) => <option key={year} value={year}>{year}</option>)}
    </select>
  )
}

function LevelSelect({ level, value, onChange }) {
  const options = levelOptions[level] ?? []
  return (
    <select value={value || ''} onChange={(event) => onChange(event.target.value)} className="portal-input" disabled={!level}>
      <option value="">{level ? 'Select level' : 'Select education level first'}</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  )
}

function validateEducation(education) {
  const errors = {}
  const startYear = Number(education.year_started)
  const graduatedYear = Number(education.year_graduated)
  const lastAttendedYear = Number(education.undergrad_year_last_attended)

  if (!education.level) errors.level = 'Education level is required.'
  if (!education.institution_name) errors.institution_name = 'School name is required.'
  if (!education.completion_status) errors.completion_status = 'Education status is required.'
  if (!education.year_started) errors.year_started = 'Year started is required.'
  if (education.year_started && (startYear < 1950 || startYear > currentYear)) errors.year_started = 'Select a valid year.'

  if (programModeForLevel(education.level) && !education.course_strand) {
    errors.course_strand = education.level === 'senior_high_strand'
      ? 'Strand is required.'
      : 'Program is required.'
  }

  if (education.completion_status === 'graduated') {
    if (!education.year_graduated) errors.year_graduated = 'Year graduated is required.'
    if (education.year_graduated && graduatedYear < startYear) errors.year_graduated = 'Year graduated cannot be earlier than year started.'
  }

  if (education.completion_status === 'undergraduate') {
    if (!education.undergrad_level_reached) errors.undergrad_level_reached = 'Level reached is required.'
    if (!education.undergrad_year_last_attended) errors.undergrad_year_last_attended = 'Year last attended is required.'
    if (education.undergrad_year_last_attended && lastAttendedYear < startYear) errors.undergrad_year_last_attended = 'Year last attended cannot be earlier than year started.'
    if (education.undergrad_year_last_attended && lastAttendedYear > currentYear) errors.undergrad_year_last_attended = 'Year last attended cannot be in the future.'
  }

  if (education.completion_status === 'currently_studying' && !education.current_level) {
    errors.current_level = 'Current level is required.'
  }

  return errors
}

function cleanEducation(education) {
  const status = education.completion_status || (education.year_graduated ? 'graduated' : 'undergraduate')
  const level = education.level === 'senior_high' ? 'senior_high_strand' : education.level === 'graduate' ? 'graduate_studies' : (education.level || '')

  return {
    level,
    institution_name: String(education.institution_name ?? '').trim().replace(/\s+/g, ' '),
    course_strand: programModeForLevel(level) ? String(education.course_strand ?? '').trim().replace(/\s+/g, ' ') : '',
    completion_status: status,
    year_started: education.year_started || '',
    year_graduated: status === 'graduated' ? (education.year_graduated || '') : '',
    undergrad_level_reached: status === 'undergraduate' ? (education.undergrad_level_reached || '') : '',
    undergrad_year_last_attended: status === 'undergraduate' ? (education.undergrad_year_last_attended || '') : '',
    current_level: status === 'currently_studying' ? (education.current_level || education.undergrad_level_reached || '') : '',
  }
}

function normalizeEducationForDraft(education) {
  return { ...blankEducation, ...cleanEducation(education) }
}

function educationKey(education) {
  const endYear = education.year_graduated
    || education.undergrad_year_last_attended
    || (education.completion_status === 'currently_studying' ? 'present' : '')
  return [
    normalize(education.institution_name),
    normalize(education.level),
    normalize(education.course_strand),
    education.year_started || '',
    endYear,
  ].join('|')
}

function programModeForLevel(level) {
  if (level === 'senior_high_strand' || level === 'senior_high') return 'strand'
  if (level === 'tertiary') return 'college'
  if (level === 'graduate_studies' || level === 'graduate') return 'graduate'
  return null
}

function labelForLevel(value) {
  const normalized = value === 'senior_high' ? 'senior_high_strand' : value === 'graduate' ? 'graduate_studies' : value
  return educationLevels.find((level) => level.value === normalized)?.label || 'Education level not specified'
}

function inferEducationalAttainment(educations = []) {
  const ranks = {
    'Elementary Graduate': 1,
    'High School Graduate': 2,
    'Senior High School Graduate': 3,
    'College Undergraduate': 5,
    'College Graduate': 6,
    "Master's Degree": 7,
    'Doctorate': 8,
  }

  const inferred = educations
    .map((education) => {
      const clean = cleanEducation(education)
      const isGraduated = clean.completion_status === 'graduated'
      const program = clean.course_strand.toLowerCase()

      switch (clean.level) {
        case 'elementary':
          return isGraduated ? 'Elementary Graduate' : null
        case 'secondary_non_k12':
          return isGraduated ? 'High School Graduate' : null
        case 'secondary_k12':
        case 'senior_high_strand':
          return isGraduated ? 'Senior High School Graduate' : null
        case 'tertiary':
          return isGraduated ? 'College Graduate' : 'College Undergraduate'
        case 'graduate_studies':
          if (!isGraduated) return null
          return /\b(phd|ph\.d|doctor|doctorate|juris doctor)\b/i.test(program) ? 'Doctorate' : "Master's Degree"
        default:
          return null
      }
    })
    .filter(Boolean)

  return inferred.sort((left, right) => (ranks[right] || 0) - (ranks[left] || 0))[0] || ''
}
