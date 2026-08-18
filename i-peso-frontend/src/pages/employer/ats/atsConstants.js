import { Award, Ban, CalendarCheck, Eye, Inbox, Star } from 'lucide-react'

export const PIPELINE_TABS = [
  { id: 'pending', label: 'Inbox', icon: Inbox },
  { id: 'reviewed', label: 'Reviewed', icon: Eye },
  { id: 'shortlisted', label: 'Shortlisted', icon: Star },
  { id: 'interview', label: 'Interview', icon: CalendarCheck },
  { id: 'hired', label: 'Hired', icon: Award },
  { id: 'rejected', label: 'Rejected', icon: Ban },
]

export const TERMINAL_STATUSES = ['hired', 'rejected', 'withdrawn']

export const SORT_OPTIONS = [
  { value: 'match_score', dir: 'desc', label: 'Highest Match Score' },
  { value: 'applied_date', dir: 'desc', label: 'Date Applied (Newest)' },
  { value: 'name', dir: 'asc', label: 'Name (A-Z)' },
]

export const PAGE_SIZE_OPTIONS = [10, 25, 50]

export const EMPLOYER_MISMATCH_REASONS = [
  ['salary_expectation_not_met', 'Salary expectation is not met'],
  ['lack_competencies_skills', 'Lack of competencies or skills'],
  ['lack_license_certification', 'Lack of professional license or TESDA certification'],
  ['documentary_requirements', 'Failed to submit documentary requirements'],
  ['other_reason', 'Other reason'],
]

export const SEEKER_MISMATCH_REASONS = [
  ['', 'Not reported'],
  ['skill_mismatch', 'Skill mismatch'],
  ['transportation_location', 'Transportation or location issue'],
  ['working_environment', 'Working environment is not acceptable'],
  ['other_reason', 'Other reason'],
]

export const EMPLOYMENT_TYPE_OPTIONS = [
  ['regular', 'Regular / Permanent'],
  ['contractual', 'Contractual / Project-based'],
  ['probationary', 'Probationary'],
  ['part_time', 'Part-Time'],
]

export const INTERVIEW_MODE_OPTIONS = [
  ['online', 'Online (Video Call)'],
  ['face_to_face', 'Face-to-Face (On-site)'],
  ['phone', 'Phone Call'],
]

export const VENUE_LABEL_BY_MODE = {
  online: 'Meeting link',
  face_to_face: 'Venue address',
  phone: 'Phone number to call',
}
