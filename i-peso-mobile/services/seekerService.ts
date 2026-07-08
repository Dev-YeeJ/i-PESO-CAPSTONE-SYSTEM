import apiClient from './api'

export interface ProfileStrengthItem {
  key?: string
  label: string
  complete: boolean
  weight?: number
}

export interface SeekerProfile {
  id?: number | string
  name?: string
  first_name?: string
  middle_name?: string | null
  last_name?: string
  email?: string
  mobile_number?: string | null
  profile_completed?: boolean
  educ_attainment?: string | null
  address_house_street?: string | null
  address_barangay?: string | null
  address_municipality_city?: string | null
  address_province?: string | null
  employment_status?: string | null
  work_type_preference?: string | null
  preferred_work_location?: string | null
  preferred_locations_details?: string[] | null
  occupations?: Array<Record<string, unknown>>
  languages?: Array<Record<string, unknown>>
  educations?: Array<Record<string, unknown>>
  trainings?: Array<Record<string, unknown>>
  eligibilities?: Array<Record<string, unknown>>
  work_experiences?: Array<Record<string, unknown>>
  certificates?: Array<Record<string, unknown>>
  dole_skills?: string[]
  technical_skills?: string[]
  soft_skills?: string[]
  has_resume?: boolean
  has_profile_image?: boolean
  dashboard_stats?: {
    active_applications?: number
    skills?: number
    saved_jobs?: number
  }
  profile_strength?: {
    percentage?: number
    items?: ProfileStrengthItem[]
    coreComplete?: number
    coreTotal?: number
  }
}

export interface NearbyJob {
  post_id: number | string
  job_title?: string
  employer?: {
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
  match?: {
    percentage?: number
    eligible?: boolean
    label?: string
  } | null
  has_applied?: boolean
  application_id?: number | string | null
  application_status?: string | null
}

export interface NearbyJobsResponse {
  radius_km?: number
  count?: number
  jobs?: NearbyJob[]
  message?: string
  code?: string
}

export interface SeekerApplication {
  apply_id: number | string
  post_id: number | string
  seeker_id?: number | string
  status: string
  status_label?: string
  match_percentage?: number
  employer_remarks?: string | null
  applied_at?: string | null
  status_changed_at?: string | null
  job?: NearbyJob & {
    employer?: {
      employer_id?: number | string | null
      company_name?: string | null
    } | null
  } | null
  interview?: {
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

// Phase 3 Interfaces
export interface SeekerNotification {
  id: string
  type: string
  notifiable_type: string
  notifiable_id: number | string
  data: {
    title: string
    message: string
    type?: string
    action_url?: string
    action_type?: string
    reference_id?: number | string
  }
  read_at: string | null
  created_at: string
}

export interface JobFair {
  job_fair_id: number | string
  title: string
  description?: string | null
  start_date: string
  end_date: string
  status: string
  venue?: string | null
  city_municipality?: string | null
  province?: string | null
  employers_count?: number
  vacancies_count?: number
  banner_image_path?: string | null
  has_rsvped?: boolean
}

export interface GovernmentProgram {
  program_id: number | string
  title: string
  description: string
  program_type: string
  status: string
  requirements?: string | null
  benefits?: string | null
  capacity?: number | null
  start_date?: string | null
  end_date?: string | null
  location?: string | null
  contact_person?: string | null
  contact_number?: string | null
  contact_email?: string | null
}

export interface GovernmentProgramApplication {
  application_id: number | string
  program_id: number | string
  seeker_id: number | string
  status: string
  remarks?: string | null
  applied_at: string
  program?: GovernmentProgram
}

export const seekerService = {
  async getProfile(): Promise<SeekerProfile> {
    const res = await apiClient.get('/seeker/profile')
    return res.data?.user ?? res.data
  },

  async getNearbyJobs({ radiusKm = 20, limit = 24 } = {}): Promise<NearbyJobsResponse> {
    const res = await apiClient.get('/seeker/nearby-jobs', {
      params: {
        radius_km: radiusKm,
        limit,
      },
    })

    return res.data
  },

  async getApplications(): Promise<SeekerApplicationsResponse> {
    const res = await apiClient.get('/seeker/applications')
    return res.data
  },

  async applyToJob(postId: number | string) {
    const res = await apiClient.post(`/seeker/jobs/${postId}/apply`)
    return res.data
  },

  async saveStep(step: number, payload: Record<string, unknown>) {
    const res = await apiClient.post(`/seeker/step-${step}`, payload)
    return res.data
  },

  async toggleSavedJob(postId: number | string): Promise<{ message: string, saved_jobs: number[] }> {
    const res = await apiClient.post(`/seeker/saved-jobs/${postId}`)
    return res.data
  },

  // Notifications
  async getNotifications(): Promise<SeekerNotification[]> {
    const res = await apiClient.get('/seeker/notifications')
    return res.data?.data || res.data || []
  },

  async markNotificationsRead(): Promise<void> {
    await apiClient.patch('/seeker/notifications/read-all')
  },

  async markNotificationRead(id: string): Promise<void> {
    await apiClient.patch(`/seeker/notifications/${id}/read`)
  },

  // Job Fairs
  async getJobFairs(): Promise<{ data: JobFair[] }> {
    const res = await apiClient.get('/job-fairs')
    return res.data
  },

  async getJobFair(id: string | number): Promise<JobFair> {
    const res = await apiClient.get(`/job-fairs/${id}`)
    return res.data?.data || res.data
  },

  async rsvpJobFair(id: string | number): Promise<void> {
    await apiClient.post(`/job-fairs/${id}/rsvp`)
  },

  // Upskill Hub / Government Programs
  async getUpskillHub(): Promise<{ programs: GovernmentProgram[] }> {
    const res = await apiClient.get('/seeker/upskill-hub')
    return res.data
  },

  async getGovernmentProgram(id: string | number): Promise<GovernmentProgram> {
    const res = await apiClient.get(`/seeker/government-programs/${id}`)
    return res.data?.data || res.data
  },

  async applyGovernmentProgram(id: string | number): Promise<void> {
    await apiClient.post(`/seeker/government-programs/${id}/apply`)
  },
}
