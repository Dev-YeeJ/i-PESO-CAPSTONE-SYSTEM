import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import type { KeyboardTypeOptions } from 'react-native'
import type { AxiosError } from 'axios'
import { router } from 'expo-router'
import { seekerService } from '@/services/seekerService'
import { useAuthStore } from '@/stores/authStore'

interface ApiErrorBody {
  message?: string
  errors?: Record<string, string[]>
}

type FormState = Record<string, string>

const steps = [
  'Personal',
  'Employment',
  'Preferences',
  'Languages',
  'Education',
  'Training',
  'Experience',
]

const currentYear = new Date().getFullYear()

const initialForm: FormState = {
  first_name: '',
  middle_name: '',
  last_name: '',
  suffix: '',
  date_of_birth: '',
  sex: 'male',
  civil_status: 'single',
  religion: 'roman_catholic',
  height_ft: '5.4',
  tin: '',
  address_province: 'Pangasinan',
  address_municipality_city: 'Urdaneta City',
  address_barangay: '',
  address_house_street: '',
  employment_status: 'unemployed',
  unemployment_months: '0',
  unemployment_reason: 'fresh_graduate',
  employment_type: 'wage_employed',
  self_employed_type: '',
  is_ofw: 'false',
  is_former_ofw: 'false',
  is_4ps_beneficiary: 'false',
  work_type_preference: 'full_time',
  preferred_work_location: 'local',
  preferred_location: 'Urdaneta City, Pangasinan',
  desired_job_title: '',
  education_level: 'tertiary',
  institution_name: '',
  course_strand: '',
  completion_status: 'graduated',
  year_started: String(Math.max(2000, currentYear - 4)),
  year_graduated: String(currentYear),
  currently_in_school: 'false',
  dole_skills: '',
  technical_skills: '',
  soft_skills: '',
  training_course: '',
  training_institution: '',
  training_hours: '',
  eligibility_name: '',
  company_name: '',
  company_address: '',
  position: '',
  number_of_months: '',
  work_employment_status: '',
}

function toBool(value: string) {
  return value === 'true'
}

function splitList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function firstServerError(errors: Record<string, string[]> = {}) {
  const key = Object.keys(errors)[0]
  return key ? errors[key]?.[0] : ''
}

function normalizeYear(value: string) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return currentYear
  return parsed
}

function technicalSkillItems(value: string) {
  return splitList(value).map((name) => ({ name, proficiency: 'intermediate' }))
}

function payloadForStep(step: number, form: FormState) {
  if (step === 1) {
    return {
      first_name: form.first_name.trim(),
      middle_name: form.middle_name.trim() || null,
      last_name: form.last_name.trim(),
      suffix: form.suffix.trim(),
      date_of_birth: form.date_of_birth.trim(),
      sex: form.sex,
      civil_status: form.civil_status,
      religion: form.religion,
      religion_other: null,
      height_ft: Number(form.height_ft),
      tin: form.tin.trim() || null,
      address_province: form.address_province.trim(),
      address_municipality_city: form.address_municipality_city.trim(),
      address_barangay: form.address_barangay.trim(),
      address_house_street: form.address_house_street.trim(),
      disabilities: ['none'],
      disability_specification: null,
    }
  }

  if (step === 2) {
    const unemployed = form.employment_status === 'unemployed'
    const employed = form.employment_status === 'employed'
    return {
      employment_status: form.employment_status,
      employment_type: employed ? form.employment_type : null,
      self_employed_type: employed && form.employment_type === 'self_employed' ? form.self_employed_type || 'others' : null,
      self_employed_type_others: employed && form.self_employed_type === 'others' ? 'Self-employed' : null,
      unemployment_months: unemployed ? Number(form.unemployment_months || 0) : null,
      unemployment_reason: unemployed ? form.unemployment_reason : null,
      unemployment_reason_others: null,
      unemployment_terminated_country: null,
      is_ofw: toBool(form.is_ofw),
      ofw_country: null,
      is_former_ofw: toBool(form.is_former_ofw),
      former_ofw_country: null,
      former_ofw_return_date: null,
      is_4ps_beneficiary: toBool(form.is_4ps_beneficiary),
      household_id_4ps: null,
    }
  }

  if (step === 3) {
    return {
      work_type_preference: form.work_type_preference,
      preferred_work_location: form.preferred_work_location,
      preferred_locations_details: [form.preferred_location.trim()],
      occupation_preferences: [
        {
          raw_job_title: form.desired_job_title.trim(),
          source: 'manual',
        },
      ],
    }
  }

  if (step === 4) {
    return {
      languages: [
        { language: 'filipino', can_read: true, can_write: true, can_speak: true, can_understand: true },
        { language: 'english', can_read: true, can_write: true, can_speak: true, can_understand: true },
      ],
    }
  }

  if (step === 5) {
    const graduated = form.completion_status === 'graduated'
    const undergraduate = form.completion_status === 'undergraduate'
    const currentlyStudying = form.completion_status === 'currently_studying'
    return {
      currently_in_school: toBool(form.currently_in_school) || currentlyStudying,
      educations: [
        {
          level: form.education_level,
          institution_name: form.institution_name.trim(),
          course_strand: form.course_strand.trim() || null,
          completion_status: form.completion_status,
          year_started: normalizeYear(form.year_started),
          year_graduated: graduated ? normalizeYear(form.year_graduated) : null,
          undergrad_level_reached: undergraduate ? 'Last year attended' : null,
          undergrad_year_last_attended: undergraduate ? normalizeYear(form.year_graduated || form.year_started) : null,
          current_level: currentlyStudying ? 'Currently enrolled' : null,
        },
      ],
      dole_skills: splitList(form.dole_skills),
      technical_skills: technicalSkillItems(form.technical_skills),
      soft_skills: technicalSkillItems(form.soft_skills),
    }
  }

  if (step === 6) {
    const trainings = form.training_course.trim()
      ? [{
          course: form.training_course.trim(),
          hours_of_training: form.training_hours ? Number(form.training_hours) : null,
          training_institution: form.training_institution.trim() || null,
        }]
      : []
    const eligibilities = form.eligibility_name.trim()
      ? [{ type: 'professional_license', name: form.eligibility_name.trim() }]
      : []

    return { trainings, eligibilities }
  }

  const workExperiences = form.company_name.trim() && form.position.trim()
    ? [{
        company_name: form.company_name.trim(),
        company_address: form.company_address.trim() || null,
        position: form.position.trim(),
        number_of_months: form.number_of_months ? Number(form.number_of_months) : null,
        employment_status: form.work_employment_status || null,
      }]
    : []

  return { work_experiences: workExperiences }
}

function validateStep(step: number, form: FormState) {
  const required: Record<number, string[]> = {
    1: ['first_name', 'last_name', 'date_of_birth', 'height_ft', 'address_province', 'address_municipality_city', 'address_barangay', 'address_house_street'],
    2: ['employment_status'],
    3: ['preferred_location', 'desired_job_title'],
    4: [],
    5: ['institution_name', 'year_started'],
    6: [],
    7: [],
  }

  const missing = (required[step] ?? []).find((key) => !String(form[key] ?? '').trim())
  if (missing) return 'Please complete the required fields before continuing.'
  if (step === 5 && ['tertiary', 'senior_high_strand', 'graduate_studies'].includes(form.education_level) && !form.course_strand.trim()) {
    return 'Course, strand, or program is required for this education level.'
  }
  return ''
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  keyboardType?: KeyboardTypeOptions
  multiline?: boolean
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize="words"
      />
    </View>
  )
}

function Choice({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.choice, active && styles.choiceActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

export default function OnboardingScreen() {
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const updateUser = useAuthStore((state) => state.updateUser)

  const [form, setForm] = useState<FormState>(() => ({
    ...initialForm,
    first_name: user?.first_name ?? user?.name?.split(' ')[0] ?? '',
    last_name: user?.last_name ?? user?.name?.split(' ').slice(1).join(' ') ?? '',
  }))
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState('')

  const progress = useMemo(() => Math.round((step / steps.length) * 100), [step])

  useEffect(() => {
    if (!isInitialized) return
    if (!isAuthenticated) {
      router.replace('/(auth)/login')
      return
    }
    if (user?.profile_completed) {
      router.replace('/(seeker)')
    }
  }, [isAuthenticated, isInitialized, user?.profile_completed])

  useEffect(() => {
    let active = true

    seekerService.getProfile()
      .then((data) => {
        if (!active) return
        const profile = data
        setForm((current) => ({
          ...current,
          first_name: profile?.first_name ?? current.first_name,
          middle_name: profile?.middle_name ?? current.middle_name,
          last_name: profile?.last_name ?? current.last_name,
          address_province: profile?.address_province ?? current.address_province,
          address_municipality_city: profile?.address_municipality_city ?? current.address_municipality_city,
          address_barangay: profile?.address_barangay ?? current.address_barangay,
          address_house_street: profile?.address_house_street ?? current.address_house_street,
        }))
      })
      .catch(() => {
        // The form is still usable with auth payload defaults.
      })
      .finally(() => {
        if (active) setInitialLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const setValue = (key: string, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
    setError('')
  }

  const submit = async () => {
    const validationError = validateStep(step, form)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await seekerService.saveStep(step, payloadForStep(step, form))
      if (data.user) updateUser(data.user)

      if (step < steps.length) {
        setStep((current) => current + 1)
      } else {
        updateUser({ profile_completed: true })
        router.replace('/(seeker)')
      }
    } catch (caught: unknown) {
      const err = caught as AxiosError<ApiErrorBody>
      const body = err.response?.data
      setError(firstServerError(body?.errors) || body?.message || 'Unable to save this step. Check the required fields and backend connection.')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#1d4ed8" />
        <Text style={styles.loadingText}>Preparing your profile...</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>Job Seeker Registration</Text>
        <Text style={styles.title}>Complete your NSRP profile</Text>
        <Text style={styles.subtitle}>Step {step} of {steps.length}: {steps[step - 1]}</Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          {step === 1 && (
            <>
              <Field label="First Name" value={form.first_name} onChangeText={(value) => setValue('first_name', value)} />
              <Field label="Middle Name" value={form.middle_name} onChangeText={(value) => setValue('middle_name', value)} />
              <Field label="Last Name" value={form.last_name} onChangeText={(value) => setValue('last_name', value)} />
              <Field label="Date of Birth" value={form.date_of_birth} onChangeText={(value) => setValue('date_of_birth', value)} placeholder="YYYY-MM-DD" />
              <Text style={styles.label}>Sex</Text>
              <View style={styles.choiceRow}>
                <Choice label="Male" active={form.sex === 'male'} onPress={() => setValue('sex', 'male')} />
                <Choice label="Female" active={form.sex === 'female'} onPress={() => setValue('sex', 'female')} />
              </View>
              <Text style={styles.label}>Civil Status</Text>
              <View style={styles.choiceGrid}>
                {['single', 'married', 'widowed', 'separated'].map((value) => (
                  <Choice key={value} label={value.replace('_', ' ')} active={form.civil_status === value} onPress={() => setValue('civil_status', value)} />
                ))}
              </View>
              <Field label="Height in feet" value={form.height_ft} onChangeText={(value) => setValue('height_ft', value)} keyboardType="decimal-pad" />
              <Field label="Province" value={form.address_province} onChangeText={(value) => setValue('address_province', value)} />
              <Field label="City / Municipality" value={form.address_municipality_city} onChangeText={(value) => setValue('address_municipality_city', value)} />
              <Field label="Barangay" value={form.address_barangay} onChangeText={(value) => setValue('address_barangay', value)} />
              <Field label="House No. / Street" value={form.address_house_street} onChangeText={(value) => setValue('address_house_street', value)} />
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.label}>Current Employment Status</Text>
              <View style={styles.choiceRow}>
                <Choice label="Unemployed" active={form.employment_status === 'unemployed'} onPress={() => setValue('employment_status', 'unemployed')} />
                <Choice label="Employed" active={form.employment_status === 'employed'} onPress={() => setValue('employment_status', 'employed')} />
              </View>
              {form.employment_status === 'unemployed' ? (
                <>
                  <Field label="Months Unemployed" value={form.unemployment_months} onChangeText={(value) => setValue('unemployment_months', value)} keyboardType="number-pad" />
                  <Text style={styles.label}>Reason</Text>
                  <View style={styles.choiceGrid}>
                    <Choice label="Fresh graduate" active={form.unemployment_reason === 'fresh_graduate'} onPress={() => setValue('unemployment_reason', 'fresh_graduate')} />
                    <Choice label="Finished contract" active={form.unemployment_reason === 'finished_contract'} onPress={() => setValue('unemployment_reason', 'finished_contract')} />
                    <Choice label="Resigned" active={form.unemployment_reason === 'resigned'} onPress={() => setValue('unemployment_reason', 'resigned')} />
                    <Choice label="Others" active={form.unemployment_reason === 'others'} onPress={() => setValue('unemployment_reason', 'others')} />
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.label}>Employment Type</Text>
                  <View style={styles.choiceRow}>
                    <Choice label="Wage employed" active={form.employment_type === 'wage_employed'} onPress={() => setValue('employment_type', 'wage_employed')} />
                    <Choice label="Self-employed" active={form.employment_type === 'self_employed'} onPress={() => setValue('employment_type', 'self_employed')} />
                  </View>
                </>
              )}
              <Text style={styles.label}>OFW / 4Ps</Text>
              <View style={styles.choiceGrid}>
                <Choice label="Not OFW" active={form.is_ofw === 'false'} onPress={() => setValue('is_ofw', 'false')} />
                <Choice label="Current OFW" active={form.is_ofw === 'true'} onPress={() => setValue('is_ofw', 'true')} />
                <Choice label="Not 4Ps" active={form.is_4ps_beneficiary === 'false'} onPress={() => setValue('is_4ps_beneficiary', 'false')} />
                <Choice label="4Ps beneficiary" active={form.is_4ps_beneficiary === 'true'} onPress={() => setValue('is_4ps_beneficiary', 'true')} />
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.label}>Preferred Work Type</Text>
              <View style={styles.choiceRow}>
                <Choice label="Full-time" active={form.work_type_preference === 'full_time'} onPress={() => setValue('work_type_preference', 'full_time')} />
                <Choice label="Part-time" active={form.work_type_preference === 'part_time'} onPress={() => setValue('work_type_preference', 'part_time')} />
              </View>
              <Text style={styles.label}>Preferred Work Location</Text>
              <View style={styles.choiceRow}>
                <Choice label="Local" active={form.preferred_work_location === 'local'} onPress={() => setValue('preferred_work_location', 'local')} />
                <Choice label="Overseas" active={form.preferred_work_location === 'overseas'} onPress={() => setValue('preferred_work_location', 'overseas')} />
              </View>
              <Field label="Preferred Location" value={form.preferred_location} onChangeText={(value) => setValue('preferred_location', value)} />
              <Field label="Desired Job Title" value={form.desired_job_title} onChangeText={(value) => setValue('desired_job_title', value)} placeholder="e.g. Administrative Assistant" />
            </>
          )}

          {step === 4 && (
            <View>
              <Text style={styles.infoTitle}>Language proficiency</Text>
              <Text style={styles.infoText}>The mobile app will save Filipino and English as readable, writable, speakable, and understandable. You can add more languages later from the web profile.</Text>
            </View>
          )}

          {step === 5 && (
            <>
              <Text style={styles.label}>Education Level</Text>
              <View style={styles.choiceGrid}>
                <Choice label="Senior High" active={form.education_level === 'senior_high_strand'} onPress={() => setValue('education_level', 'senior_high_strand')} />
                <Choice label="College" active={form.education_level === 'tertiary'} onPress={() => setValue('education_level', 'tertiary')} />
                <Choice label="Vocational" active={form.education_level === 'secondary_k12'} onPress={() => setValue('education_level', 'secondary_k12')} />
                <Choice label="Graduate" active={form.education_level === 'graduate_studies'} onPress={() => setValue('education_level', 'graduate_studies')} />
              </View>
              <Field label="School / Institution" value={form.institution_name} onChangeText={(value) => setValue('institution_name', value)} />
              <Field label="Course / Strand / Program" value={form.course_strand} onChangeText={(value) => setValue('course_strand', value)} />
              <Text style={styles.label}>Completion Status</Text>
              <View style={styles.choiceGrid}>
                <Choice label="Graduated" active={form.completion_status === 'graduated'} onPress={() => setValue('completion_status', 'graduated')} />
                <Choice label="Undergraduate" active={form.completion_status === 'undergraduate'} onPress={() => setValue('completion_status', 'undergraduate')} />
                <Choice label="Currently studying" active={form.completion_status === 'currently_studying'} onPress={() => setValue('completion_status', 'currently_studying')} />
              </View>
              <Field label="Year Started" value={form.year_started} onChangeText={(value) => setValue('year_started', value)} keyboardType="number-pad" />
              <Field label="Year Graduated / Last Attended" value={form.year_graduated} onChangeText={(value) => setValue('year_graduated', value)} keyboardType="number-pad" />
              <Field label="DOLE Skills" value={form.dole_skills} onChangeText={(value) => setValue('dole_skills', value)} placeholder="Separate with commas" multiline />
              <Field label="Technical Skills" value={form.technical_skills} onChangeText={(value) => setValue('technical_skills', value)} placeholder="e.g. MS Excel, Data Encoding" multiline />
              <Field label="Soft Skills" value={form.soft_skills} onChangeText={(value) => setValue('soft_skills', value)} placeholder="e.g. Communication, Teamwork" multiline />
            </>
          )}

          {step === 6 && (
            <>
              <Text style={styles.infoText}>Optional. Leave blank if you have no training or license yet.</Text>
              <Field label="Training Course" value={form.training_course} onChangeText={(value) => setValue('training_course', value)} />
              <Field label="Training Institution" value={form.training_institution} onChangeText={(value) => setValue('training_institution', value)} />
              <Field label="Hours of Training" value={form.training_hours} onChangeText={(value) => setValue('training_hours', value)} keyboardType="number-pad" />
              <Field label="License / Eligibility Name" value={form.eligibility_name} onChangeText={(value) => setValue('eligibility_name', value)} />
            </>
          )}

          {step === 7 && (
            <>
              <Text style={styles.infoText}>Optional. Leave blank if you are a first-time job seeker.</Text>
              <Field label="Company Name" value={form.company_name} onChangeText={(value) => setValue('company_name', value)} />
              <Field label="Company Address" value={form.company_address} onChangeText={(value) => setValue('company_address', value)} />
              <Field label="Position" value={form.position} onChangeText={(value) => setValue('position', value)} />
              <Field label="Number of Months" value={form.number_of_months} onChangeText={(value) => setValue('number_of_months', value)} keyboardType="number-pad" />
            </>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.secondaryButton, step === 1 && styles.disabledButton]}
            onPress={() => setStep((current) => Math.max(1, current - 1))}
            disabled={step === 1 || loading}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={submit} disabled={loading} activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>{step === steps.length ? 'Finish' : 'Save and Continue'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f8fafc' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 10, color: '#64748b', fontSize: 13 },
  container: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 36 },
  kicker: { color: '#1d4ed8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { marginTop: 8, color: '#0f172a', fontSize: 25, fontWeight: '800' },
  subtitle: { marginTop: 6, color: '#64748b', fontSize: 14, lineHeight: 20 },
  progressTrack: { marginTop: 18, height: 8, borderRadius: 999, backgroundColor: '#e2e8f0', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#1d4ed8' },
  errorBox: { marginTop: 16, borderRadius: 14, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2', padding: 12 },
  errorText: { color: '#b91c1c', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  card: { marginTop: 18, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', padding: 18 },
  field: { marginBottom: 14 },
  label: { marginBottom: 7, color: '#334155', fontSize: 12, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 14, paddingVertical: 12, color: '#0f172a', fontSize: 14 },
  multiline: { minHeight: 76, textAlignVertical: 'top' },
  choiceRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  choice: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  choiceActive: { borderColor: '#1d4ed8', backgroundColor: '#eff6ff' },
  choiceText: { color: '#475569', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  choiceTextActive: { color: '#1d4ed8' },
  infoTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800', marginBottom: 8 },
  infoText: { color: '#64748b', fontSize: 13, lineHeight: 20, marginBottom: 16 },
  footer: { flexDirection: 'row', gap: 10, marginTop: 18 },
  secondaryButton: { flex: 0.8, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  disabledButton: { opacity: 0.45 },
  secondaryButtonText: { color: '#475569', fontSize: 14, fontWeight: '800' },
  primaryButton: { flex: 1.4, backgroundColor: '#1d4ed8', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
})
