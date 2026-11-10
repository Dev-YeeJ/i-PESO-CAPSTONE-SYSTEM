// i-peso-frontend/src/services/reviewService.js
// Verified Mutual Feedback System — job seekers' reviews of employers.

import api from './api'

export const reviewService = {
  // What the seeker can review, and the reviews they've written.
  getMine: async () => {
    const { data } = await api.get('/seeker/reviews')
    return data
  },

  submit: async (payload) => {
    const { data } = await api.post('/seeker/reviews', payload)
    return data
  },

  update: async (id, payload) => {
    const { data } = await api.put(`/seeker/reviews/${id}`, payload)
    return data
  },

  remove: async (id) => {
    const { data } = await api.delete(`/seeker/reviews/${id}`)
    return data
  },

  // Report someone else's review to PESO.
  report: async (id, payload) => {
    const { data } = await api.post(`/seeker/reviews/${id}/report`, payload)
    return data
  },

  // Small ratings for the job cards on screen: { [employerId]: { average, reviewers } }
  ratings: async (employerIds) => {
    const { data } = await api.get('/seeker/employer-ratings', { params: { ids: employerIds } })
    return data.ratings ?? {}
  },

  // A company's reputation summary and published reviews (anonymous).
  forEmployer: async (employerId, params = {}) => {
    const { data } = await api.get(`/seeker/employers/${employerId}/reviews`, { params })
    return data
  },
}
