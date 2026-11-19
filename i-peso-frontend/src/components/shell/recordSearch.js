import { BriefcaseBusiness, Building2, Landmark, UserRound, UsersRound } from 'lucide-react'
import api from '@/services/api'

/**
 * Record search per portal, used by the ⌘K palette. The API decides what each
 * account may see (staff by module, employers only their own records, seekers
 * only open listings); this only maps result types to where they open.
 */
export const RECORD_SEARCH = {
  admin: {
    endpoint: '/admin/search',
    types: {
      seeker: { icon: UserRound, to: (id) => `/admin/job-seekers/${id}` },
      employer: { icon: Building2, to: (id) => `/admin/employers/${id}` },
      vacancy: { icon: BriefcaseBusiness, to: (id) => `/admin/job-postings/${id}` },
    },
  },
  employer: {
    endpoint: '/employer/search',
    types: {
      vacancy: { icon: BriefcaseBusiness, to: (id) => `/employer/ats/${id}` },
      applicant: { icon: UsersRound, to: (id) => `/employer/ats/applicant/${id}` },
    },
  },
  seeker: {
    endpoint: '/seeker/search',
    types: {
      job: { icon: BriefcaseBusiness, to: (id) => `/seeker/job-map/${id}` },
      program: { icon: Landmark, to: (id) => `/seeker/government-programs/${id}` },
    },
  },
}

export const MIN_QUERY_LENGTH = 2

export async function searchRecords(portal, q, signal) {
  const response = await api.get(RECORD_SEARCH[portal].endpoint, { params: { q }, signal })
  return response.data?.groups ?? []
}
