// i-peso-frontend/src/services/employerFeedbackService.js
// Employer side of the Verified Mutual Feedback System.

import api from './api'

export const employerFeedbackService = {
  // Reviews of the company (anonymous) with the summary.
  getReviews: async (params = {}) => {
    const { data } = await api.get('/employer/reviews', { params })
    return data
  },

  // One public reply per review; posting again edits it.
  reply: async (reviewId, body) => {
    const { data } = await api.post(`/employer/reviews/${reviewId}/reply`, { body })
    return data
  },

  deleteReply: async (reviewId) => {
    const { data } = await api.delete(`/employer/reviews/${reviewId}/reply`)
    return data
  },


  // People this employer hired, with any private feedback already given.
  getHires: async () => {
    const { data } = await api.get('/employer/hires')
    return data
  },

  // The 2x2 photo of someone this employer hired (authenticated, so fetched as a blob).
  getHirePhoto: async (seekerId) => {
    const { data } = await api.get(`/employer/hires/${seekerId}/photo`, { responseType: 'blob' })
    return data
  },

  saveWorkerFeedback: async (payload) => {
    const { data } = await api.post('/employer/worker-feedback', payload)
    return data
  },
}
