import apiClient, { API_BASE_URL } from './api'

export interface ProfileStrengthItem {
  key?: string
  label: string
  complete: boolean
  weight?: number
}

export interface ProfileStrength {
  percentage?: number
  items?: ProfileStrengthItem[]
  coreComplete?: number
  coreTotal?: number
}

export interface SeekerCertificate {
  certificate_id: number | string
  title: string
  issuing_body: string
  category: string
  issued_at?: string | null
  expires_at?: string | null
  credential_number?: string | null
  description?: string | null
  training_id?: number | string | null
  training?: { id: number | string; course?: string; training_institution?: string | null } | null
  original_filename?: string | null
  mime_type?: string | null
  file_size?: number | null
  created_at?: string | null
}

export interface SeekerProfile {
  id?: number | string
  name?: string
  first_name?: string
  middle_name?: string | null
  last_name?: string
  suffix?: string | null
  email?: string
  mobile_number?: string | null
  profile_completed?: boolean
  form_validation_state?: Record<string, boolean> | null
  date_of_birth?: string | null
  sex?: string | null
  civil_status?: string | null
  religion?: string | null
  height_ft?: number | string | null
  tin?: string | null
  educ_attainment?: string | null
  address_house_street?: string | null
  address_barangay?: string | null
  address_municipality_city?: string | null
  address_province?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
  disabilities?: Array<{ disability_type: string; disability_specification?: string | null }>
  is_4ps_beneficiary?: boolean | null
  household_id_4ps?: string | null
  employment_status?: string | null
  employment_type?: string | null
  self_employed_type?: string | null
  self_employed_type_others?: string | null
  unemployment_months?: number | null
  unemployment_reason?: string | null
  unemployment_reason_others?: string | null
  unemployment_terminated_country?: string | null
  is_ofw?: boolean | null
  ofw_country?: string | null
  is_former_ofw?: boolean | null
  former_ofw_country?: string | null
  former_ofw_return_date?: string | null
  work_type_preference?: string | null
  preferred_work_location?: string | null
  preferred_locations_details?: string[] | null
  occupations?: Array<Record<string, unknown>>
  languages?: Array<Record<string, unknown>>
  currently_in_school?: boolean | null
  educations?: Array<Record<string, unknown>>
  trainings?: Array<Record<string, unknown>>
  eligibilities?: Array<Record<string, unknown>>
  work_experiences?: Array<Record<string, unknown>>
  certificates?: SeekerCertificate[]
  dole_skills?: string[]
  technical_skills?: string[]
  soft_skills?: string[]
  profile_image_url?: string | null
  has_resume?: boolean
  has_profile_image?: boolean
  dashboard_stats?: {
    active_applications?: number
    skills?: number
    saved_jobs?: Array<number | string>
  }
  profile_strength?: ProfileStrength
}

export interface JobFilters {
  radiusKm?: number
  minMatch?: number
  keyword?: string
  locationKeyword?: string
  sort?: 'distance' | 'match' | 'newest' | 'salary'
  feedMode?: 'nearby' | 'recommended' | 'latest'
  jobType?: string
  salaryMin?: number
  salaryMax?: number
  hideLowMatch?: boolean
  hideApplied?: boolean
  savedOnly?: boolean
  jobFairOnly?: boolean
  upskillRecommendedOnly?: boolean
  certificateMatchOnly?: boolean
  canApplyOnly?: boolean
  maxMissingSkills?: number
  limit?: number
  compact?: boolean
  jobId?: number | string
  /** Overrides the seeker's stored profile location for this search (e.g. "use current location"). */
  lat?: number
  lng?: number
  coordinatesOnly?: boolean
}

export interface JobSkillGap {
  skill: string
  reason?: string | null
  matched_skill?: string | null
  required_match_factor?: number
  actual_match_factor?: number
}

export interface NearbyJob {
  post_id: number | string
  vacancy_id?: number | string
  job_title?: string
  employer?: {
    employer_id?: number | string | null
    company_name?: string | null
  } | null
  employment_type?: string | null
  work_setup?: string | null
  location?: string | null
  province?: string | null
  city_municipality?: string | null
  barangay?: string | null
  job_description?: string | null
  vacancies_count?: number | null
  minimum_education?: string | null
  experience_level?: string | null
  salary_min?: number | string | null
  salary_max?: number | string | null
  salary_type?: string | null
  hide_salary?: boolean | number | null
  benefits?: string[] | string | null
  required_skills?: string[] | string | null
  soft_skills?: string[] | string | null
  required_certifications?: string[] | string | null
  application_deadline?: string | null
  distance_km?: number | string | null
  posted_at?: string | null
  // Already returned by GET /seeker/job-map (SeekerNearbyJobController) but unused
  // by the current flat-list UI. Typed here so a future map view can read it
  // without any backend change — see the Job Map readiness note in the repo.
  latitude?: number | string | null
  longitude?: number | string | null
  match?: {
    percentage?: number
    eligible?: boolean
    label?: string
  } | null
  match_percentage?: number
  match_breakdown?: { skills?: number; occupation?: number; experience?: number; education?: number } | null
  matched_skills?: string[]
  missing_skills?: JobSkillGap[]
  certificate_match?: { matched?: boolean; matched_count?: number; required_count?: number } | null
  job_fair?: { is_available_at_job_fair?: boolean; job_fair_id?: number | string; title?: string; date?: string; venue?: string; has_rsvp?: boolean } | null
  upskill?: { recommended?: boolean; programs?: unknown[]; missing_skills_count?: number } | null
  actions?: { can_apply?: boolean; can_save?: boolean; can_rsvp_job_fair?: boolean; can_download_resume?: boolean } | null
  is_saved?: boolean
  has_applied?: boolean
  application_id?: number | string | null
  application_status?: string | null
  match_deferred?: boolean
}

export interface NearbyJobsResponse {
  radius_km?: number
  count?: number
  jobs?: NearbyJob[]
  message?: string
  code?: string
  location_available?: boolean
  seeker_location?: { latitude?: number | null; longitude?: number | null; full_address?: string | null } | null
  origin?: { latitude?: number | null; longitude?: number | null } | null
  summary?: {
    total_found?: number
    high_match_count?: number
    nearest_distance_km?: number | null
    applied_count?: number
    saved_count?: number
    job_fair_count?: number
    upskill_recommendation_count?: number
  }
}

export interface SeekerApplication {
  apply_id: number | string
  post_id: number | string
  seeker_id?: number | string
  status: string
  status_label?: string
  can_withdraw?: boolean
  match_percentage?: number
  employer_remarks?: string | null
  submitted_documents?: Record<string, unknown> | null
  applied_at?: string | null
  status_changed_at?: string | null
  timeline?: Array<{ title: string; description?: string; timestamp?: string; status?: string }>
  job?: (NearbyJob & {
    employer?: {
      employer_id?: number | string | null
      company_name?: string | null
    } | null
  }) | null
  interview?: {
    interview_id?: number | string
    mode_of_interview?: string | null
    schedule?: string | null
    venue_or_link?: string | null
    instructions?: string | null
    status?: string | null
  } | null
  placement?: {
    start_date?: string | null
    salary?: number | string | null
    captured_at?: string | null
  } | null
}

export interface SeekerApplicationsResponse {
  count?: number
  applications?: SeekerApplication[]
}

export interface SeekerNotification {
  id: string
  type: string
  notifiable_type: string
  notifiable_id: number | string
  data: {
    title: string
    message: string
    status?: string
    type?: string
    action_url?: string
    action_type?: string
    application_id?: number | string
    program_id?: number | string
    job_fair_id?: number | string
    reference_id?: number | string
  }
  read_at: string | null
  created_at: string
}

export interface NotificationsResponse {
  notifications: SeekerNotification[]
  unread_count: number
  pagination?: { current_page: number; last_page: number; total: number }
}

export interface JobFair {
  job_fair_id: number | string
  title: string
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  event_date?: string | null
  start_time?: string | null
  end_time?: string | null
  venue?: string | null
  sector?: string | null
  target_sector?: string | null
  partner_agencies?: string[] | null
  status: string
  is_public?: boolean
  participating_employers?: Array<{ employer_id?: number | string; company_name?: string | null; status?: string }>
  published_vacancies?: Array<{ post_id: number | string; job_title?: string | null; vacancies_count?: number }>
}

export interface ProgramEligibility {
  score: number
  status:
    | 'highly_eligible' | 'eligible' | 'partially_eligible'
    | 'low_match' | 'not_eligible' | 'unknown' | string
  label: string
  breakdown: Array<{ label: string; met: boolean; required: boolean; detail?: string | null }>
}

export interface GovernmentProgram {
  program_id: number | string
  title: string
  program_name?: string
  category?: string
  short_description?: string | null
  description?: string | null
  target_beneficiaries?: string | null
  eligibility_requirements?: string[] | null
  required_documents?: string[] | null
  /** In-person application steps set by PESO admin. Null/empty until an admin fills it in — callers must fall back, see getCitizenCharterSteps(). */
  citizen_charter_steps?: string[] | null
  eligibility?: ProgramEligibility | null
  target_industry?: string | null
  skills?: Array<{ id: number | string; name?: string; type?: string }>
  venue?: string | null
  location_address?: string | null
  start_date?: string | null
  end_date?: string | null
  application_deadline?: string | null
  total_slots?: number | null
  available_slots?: number | null
  status: string
  visibility?: string
  contact_person?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  has_attachment?: boolean
  applications_count?: number
  can_apply?: boolean
  my_application?: GovernmentProgramApplication | null
  recommendation_score?: number | null
  recommendation_reason?: string | null
}

export interface ProgramDocument {
  document_id: number | string
  document_type: 'requirement' | 'certificate'
  document_name: string
  original_filename?: string | null
  mime_type?: string | null
  size?: number | null
  created_at?: string | null
}

export interface GovernmentProgramApplication {
  application_id: number | string
  program_id?: number | string
  status: string
  remarks?: string | null
  eligibility_score?: number | null
  applied_at?: string | null
  reviewed_at?: string | null
  completed_at?: string | null
  documents?: ProgramDocument[]
  certificate?: { certificate_id: number | string; title: string; issued_at?: string | null } | null
  program?: GovernmentProgram
}

export interface GovernmentProgramsResponse {
  programs: { data: GovernmentProgram[]; current_page: number; last_page: number; total: number }
  categories: Record<string, number>
}

/** Shown when a program has no admin-authored citizen_charter_steps yet. */
export const CITIZEN_CHARTER_FALLBACK_STEPS: string[] = [
  'Prepare Documents',
  'Submit to PESO',
  'Wait for Review',
  'Claim Stub',
]

export function getCitizenCharterSteps(program: Pick<GovernmentProgram, 'citizen_charter_steps'>): string[] {
  const steps = program.citizen_charter_steps
  return Array.isArray(steps) && steps.length > 0 ? steps : CITIZEN_CHARTER_FALLBACK_STEPS
}

export interface OccupationOption {
  id: number
  title: string
  general_term?: string | null
  broad_category?: string | null
}

export interface OccupationClassificationSuggestion {
  occupation_title: string
  broad_field?: string | null
  general_term?: string | null
  role_function?: string | null
  confidence: number
  source: string
  reason?: string | null
  occupation_id?: number | null
  psoc_code?: string | null
}

export interface OccupationClassificationResult {
  raw_input: string
  is_valid_job_input: boolean
  needs_clarification: boolean
  suggestions: OccupationClassificationSuggestion[]
  invalid_reason?: string | null
}

export interface SkillOption {
  id: number
  name: string
  category: 'technical' | 'soft'
  source?: string
}

export interface GeocodedLocation {
  place_id?: string | null
  formatted?: string | null
  latitude: number | null
  longitude: number | null
  province_name?: string | null
  city_name?: string | null
  barangay_name?: string | null
  street?: string | null
  house_number?: string | null
}

export interface SeekerAnalytics {
  total_views_30_days: number
  search_appearances: number
  recent_viewers: Array<{ company_name: string; created_at: string; source: string | null }>
}

export interface CitizenCharterServiceItem {
  service_id: number | string
  service_name: string
  description?: string | null
  requirements?: string[] | null
  processing_time?: string | null
  fees?: string | null
  responsible_office?: string | null
  steps?: string[] | null
  contact_info?: string | null
}

export interface AiSuggestionItem {
  name: string
  reason?: string
}

export interface AiProfileSuggestions {
  occupations: AiSuggestionItem[]
  technical_skills: AiSuggestionItem[]
  soft_skills: AiSuggestionItem[]
}

export interface AiProfileSuggestionContext {
  employment_status?: string
  target_job_description?: string
  work_type_preference?: string
  educ_attainment?: string
  preferred_occupations?: Array<{ title?: string; general_term?: string | null }>
  technical_skills?: string[]
  soft_skills?: string[]
  trainings?: Array<{ course?: string; skills_acquired?: string }>
  work_experiences?: Array<{ position?: string; employment_status?: string }>
}

export interface AiParsedJobQuery {
  radius_km?: number
  min_match?: number
  keyword?: string
  location_keyword?: string
  sort?: 'distance' | 'match' | 'newest' | 'salary'
  hide_applied?: boolean
  saved_only?: boolean
  job_fair_only?: boolean
  upskill_recommended_only?: boolean
  certificate_match_only?: boolean
  can_apply_only?: boolean
  max_missing_skills?: number
}

export interface AiProfessionalSummary {
  summary: string
  highlights_used?: string[]
  source: string
}

export interface LearningResources {
  online_courses?: { platforms?: string[]; average_duration?: string; cost_range?: string }
  certifications?: { trending?: string[] }
  practice_sites?: { coding?: string; general?: string }
  estimated_learning_time?: string
}

export interface PublicEmployerProfile {
  employer_id: number | string
  company_name: string
  trade_name?: string | null
  industry?: string | null
  company_size?: string | null
  company_logo_url?: string | null
  full_address?: string | null
  company_description?: string | null
  verification_status: string
  created_at?: string | null
}

export interface EmployerVacancy {
  post_id: number | string
  job_title: string
  location?: string | null
  employment_type?: string | null
  created_at?: string | null
}

export interface EmployerProfileResponse {
  employer: PublicEmployerProfile
  vacancies: EmployerVacancy[]
}

export type EmployerReportReason = 'fake_job' | 'misleading' | 'abusive' | 'discrimination' | 'illegal_fees' | 'other'

function toFormData(fields: Record<string, unknown>, file?: { uri: string; name: string; type: string; fieldName: string }) {
  const formData = new FormData()
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    formData.append(key, String(value))
  })
  if (file) {
    formData.append(file.fieldName, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob)
  }
  return formData
}

export const seekerService = {
  // ── Profile ────────────────────────────────────────────────────────────
  async getProfile(): Promise<SeekerProfile> {
    const res = await apiClient.get('/seeker/profile')
    return res.data?.user ?? res.data
  },

  async saveStep(step: number, payload: Record<string, unknown>) {
    const res = await apiClient.post(`/seeker/step-${step}`, payload)
    return res.data
  },

  profileImageUrl(cacheBust?: string | number) {
    return `${API_BASE_URL}/seeker/profile-image${cacheBust ? `?v=${cacheBust}` : ''}`
  },

  async uploadProfileImage(uri: string, mimeType = 'image/jpeg') {
    const formData = toFormData({}, { uri, name: 'profile.jpg', type: mimeType, fieldName: 'profile_image' })
    const res = await apiClient.post('/seeker/profile-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data as { message: string; profile_image_url: string }
  },

  async deleteProfileImage() {
    const res = await apiClient.delete('/seeker/profile-image')
    return res.data
  },

  // ── Certificates ───────────────────────────────────────────────────────
  async uploadCertificate(
    uri: string,
    mimeType: string,
    fileName: string,
    meta: {
      title: string
      issuing_body: string
      category: string
      issued_at: string
      expires_at?: string | null
      credential_number?: string | null
      description?: string | null
      training_id?: number | string | null
    }
  ) {
    const formData = toFormData(meta as Record<string, unknown>, {
      uri,
      name: fileName,
      type: mimeType,
      fieldName: 'certificate_file',
    })
    const res = await apiClient.post('/seeker/certificates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data as { message: string; certificate: SeekerCertificate }
  },

  certificateViewUrl(id: number | string) {
    return `${API_BASE_URL}/seeker/certificates/${id}/view`
  },

  async deleteCertificate(id: number | string) {
    const res = await apiClient.delete(`/seeker/certificates/${id}`)
    return res.data
  },

  // ── Resume ─────────────────────────────────────────────────────────────
  resumeGenerateUrl() {
    return `${API_BASE_URL}/seeker/resume/generate`
  },

  // ── Jobs ───────────────────────────────────────────────────────────────
  async searchJobs(filters: JobFilters = {}): Promise<NearbyJobsResponse> {
    const params: Record<string, unknown> = {}
    if (filters.radiusKm) params.radius_km = filters.radiusKm
    if (filters.minMatch) params.min_match = filters.minMatch
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.locationKeyword) params.location_keyword = filters.locationKeyword
    if (filters.sort) params.sort = filters.sort
    params.feed_mode = filters.feedMode ?? 'nearby'
    if (filters.jobType) params.job_type = filters.jobType
    if (filters.salaryMin) params.salary_min = filters.salaryMin
    if (filters.salaryMax) params.salary_max = filters.salaryMax
    if (filters.hideLowMatch) params.hide_low_match = 1
    if (filters.hideApplied) params.hide_applied = 1
    if (filters.savedOnly) params.saved_only = 1
    if (filters.jobFairOnly) params.job_fair_only = 1
    if (filters.upskillRecommendedOnly) params.upskill_recommended_only = 1
    if (filters.certificateMatchOnly) params.certificate_match_only = 1
    if (filters.canApplyOnly) params.can_apply_only = 1
    if (filters.coordinatesOnly) params.coordinates_only = 1
    if (filters.maxMissingSkills !== undefined) params.max_missing_skills = filters.maxMissingSkills
    if (filters.lat !== undefined) params.lat = filters.lat
    if (filters.lng !== undefined) params.lng = filters.lng
    params.limit = filters.limit ?? 40
    if (filters.compact) params.compact = 1

    const res = await apiClient.get('/seeker/job-map', { params })
    return res.data
  },

  async getJobById(id: number | string): Promise<NearbyJob | null> {
    const res = await apiClient.get(`/seeker/job-map/${id}`)
    return res.data?.job ?? null
  },

  async toggleSavedJob(postId: number | string): Promise<{ message: string; saved_jobs: Array<number | string> }> {
    const res = await apiClient.post(`/seeker/saved-jobs/${postId}`)
    return res.data
  },

  async applyToJob(postId: number | string) {
    const res = await apiClient.post(`/seeker/jobs/${postId}/apply`)
    return res.data
  },

  // ── Employer profile (public view) ────────────────────────────────────
  async getEmployerProfile(employerId: number | string): Promise<EmployerProfileResponse> {
    const res = await apiClient.get(`/seeker/employers/${employerId}`)
    return res.data
  },

  async reportEmployer(employerId: number | string, payload: { reason: EmployerReportReason; description: string }) {
    const res = await apiClient.post(`/seeker/employers/${employerId}/report`, payload)
    return res.data as { message: string; report: { id: number | string; reason: string; status: string; created_at: string } }
  },

  // ── Applications ───────────────────────────────────────────────────────
  async getApplications(): Promise<SeekerApplicationsResponse> {
    const res = await apiClient.get('/seeker/applications')
    return res.data
  },

  async getApplication(id: number | string): Promise<SeekerApplication> {
    const res = await apiClient.get(`/seeker/applications/${id}`)
    return res.data?.application
  },

  async withdrawApplication(id: number | string) {
    const res = await apiClient.post(`/seeker/applications/${id}/withdraw`)
    return res.data as { message: string; application: SeekerApplication }
  },

  // ── Notifications ──────────────────────────────────────────────────────
  async getNotifications(page = 1, perPage = 20): Promise<NotificationsResponse> {
    const res = await apiClient.get('/seeker/notifications', { params: { page, per_page: perPage } })
    return res.data
  },

  async getUnreadNotificationCount(): Promise<number> {
    const res = await apiClient.get('/seeker/notifications/unread-count')
    return res.data?.unread_count ?? 0
  },

  async markNotificationsRead(): Promise<void> {
    await apiClient.patch('/seeker/notifications/read-all')
  },

  async markNotificationRead(id: string): Promise<void> {
    await apiClient.patch(`/seeker/notifications/${id}/read`)
  },

  // ── Job Fairs (read-only — backend has no seeker RSVP route) ─────────────
  async getJobFairs(): Promise<JobFair[]> {
    const res = await apiClient.get('/job-fairs')
    return res.data?.data ?? []
  },

  // ── Government Programs ────────────────────────────────────────────────
  async getGovernmentPrograms(params: { search?: string; category?: string; status?: string; page?: number; perPage?: number } = {}): Promise<GovernmentProgramsResponse> {
    const res = await apiClient.get('/seeker/government-programs', {
      params: {
        search: params.search || undefined,
        category: params.category || undefined,
        status: params.status || undefined,
        page: params.page || undefined,
        per_page: params.perPage || 12,
      },
    })
    return res.data
  },

  async getGovernmentProgram(id: number | string): Promise<GovernmentProgram> {
    const res = await apiClient.get(`/seeker/government-programs/${id}`)
    return res.data?.program
  },

  programAttachmentUrl(id: number | string) {
    return `${API_BASE_URL}/seeker/government-programs/${id}/attachment`
  },

  async applyToProgram(id: number | string) {
    const res = await apiClient.post(`/seeker/government-programs/${id}/apply`)
    return res.data as { message: string; application: GovernmentProgramApplication }
  },

  async getProgramApplications(): Promise<GovernmentProgramApplication[]> {
    const res = await apiClient.get('/seeker/government-program-applications')
    return res.data?.data ?? []
  },

  async uploadProgramDocument(
    applicationId: number | string,
    uri: string,
    mimeType: string,
    fileName: string,
    meta: { document_type: 'requirement' | 'certificate'; document_name: string }
  ) {
    const formData = toFormData(meta as Record<string, unknown>, {
      uri,
      name: fileName,
      type: mimeType,
      fieldName: 'file',
    })
    const res = await apiClient.post(`/seeker/government-program-applications/${applicationId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data as { message: string; document: ProgramDocument }
  },

  programDocumentUrl(applicationId: number | string, documentId: number | string) {
    return `${API_BASE_URL}/seeker/government-program-applications/${applicationId}/documents/${documentId}`
  },

  // ── Catalogs (public, used for onboarding typeahead) ──────────────────
  async searchOccupations(search: string, limit = 15): Promise<OccupationOption[]> {
    const res = await apiClient.get('/occupations', { params: { search, limit } })
    return res.data?.data ?? []
  },

  /** 3-layer catalog-then-dictionary-then-AI occupation classification, backing the Step 3 job-title combobox. */
  async classifyOccupation(title: string, limit = 5): Promise<OccupationClassificationResult> {
    const res = await apiClient.post('/seeker/classify-occupation', { title, limit })
    return res.data
  },

  async searchSkills(search: string, category: 'technical' | 'soft', limit = 15): Promise<SkillOption[]> {
    const res = await apiClient.get('/skills', { params: { search, category, limit } })
    return res.data?.data ?? []
  },

  // ── Geocoding (proxied through the backend, no client Maps SDK needed) ──
  async geocodeAddress(address: string): Promise<GeocodedLocation | null> {
    const res = await apiClient.get('/geo/geocode', { params: { address } })
    return res.data?.location ?? null
  },

  // ── Analytics / Citizen Charter / AI assist ───────────────────────────
  async getAnalytics(): Promise<SeekerAnalytics> {
    const res = await apiClient.get('/seeker/analytics')
    return res.data?.analytics ?? { total_views_30_days: 0, search_appearances: 0, recent_viewers: [] }
  },

  async getCitizenCharterServices(): Promise<CitizenCharterServiceItem[]> {
    const res = await apiClient.get('/seeker/citizen-charter')
    return res.data?.data ?? []
  },

  /** Returns null if Vertex AI is unavailable/unconfigured (backend degrades to 503) — callers should show a friendly fallback, not an error. */
  async generateProfessionalSummaryAI(existingSummary?: string): Promise<AiProfessionalSummary | null> {
    try {
      const res = await apiClient.post('/seeker/ai-professional-summary', { existing_summary: existingSummary || undefined })
      return res.data?.data ?? null
    } catch {
      return null
    }
  },

  async getLearningResources(skill: string): Promise<LearningResources> {
    const res = await apiClient.get(`/seeker/learning-resources/${encodeURIComponent(skill)}`)
    return res.data?.resources ?? {}
  },

  /** Returns null if Vertex AI is unavailable/unconfigured — callers should fall back to manual entry, not show an error. */
  async getAiProfileSuggestions(context: AiProfileSuggestionContext): Promise<AiProfileSuggestions | null> {
    try {
      const res = await apiClient.post('/seeker/ai-profile-suggestions', { context })
      return res.data?.data ?? null
    } catch {
      return null
    }
  },

  /** Returns null if Vertex AI is unavailable/unconfigured — callers should fall back to plain keyword search. */
  async parseJobSearchQuery(query: string): Promise<AiParsedJobQuery | null> {
    try {
      const res = await apiClient.post('/seeker/nearby-jobs/ai-parse', { query })
      return res.data?.data ?? null
    } catch {
      return null
    }
  },
}
