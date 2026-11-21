// i-peso-frontend/src/services/siteContentService.js
// Site Content — office details, landing page text, FAQs and versioned policy
// pages. Plan: docs/content-module-plan.md

import api from './api'

const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''))

/** No sign-in: landing page, footer, About, /privacy-policy and friends. */
export const publicSiteContentService = {
  get: async () => (await api.get('/public/site-content')).data,
  policy: async (slug) => (await api.get(`/public/policies/${slug}`)).data,
  policyVersion: async (slug, version) => (await api.get(`/public/policies/${slug}/versions/${version}`)).data,
}

export const adminSiteContentService = {
  list: async () => (await api.get('/admin/site-content')).data,
  save: async (key, values, version) => (await api.put(`/admin/site-content/${key}`, { values, version })).data,
  reset: async (key, fields, version) => (await api.post(`/admin/site-content/${key}/reset`, { fields, version })).data,
  revisions: async (key) => (await api.get(`/admin/site-content/${key}/revisions`)).data,
  restore: async (key, revisionId, version) => (await api.post(`/admin/site-content/${key}/revisions/${revisionId}/restore`, { version })).data,
}

/** Content Modules → Overview, Insights and the AI writing helper. */
export const adminContentInsightService = {
  health: async () => (await api.get('/admin/content-modules/health')).data,
  insights: async (days = 30) => (await api.get('/admin/content-modules/insights', { params: { days } })).data,
  resolve: async (normalized) => (await api.post('/admin/content-modules/insights/resolve', { kind: 'gap', normalized })).data,
  /** task: draft_answer | simplify | translate_filipino | suggest_question */
  assist: async (payload) => (await api.post('/admin/content-modules/ai-assist', payload)).data,
}

export const adminFaqService = {
  list: async (params = {}) => (await api.get('/admin/faqs', { params: clean(params) })).data,
  create: async (values) => (await api.post('/admin/faqs', values)).data,
  update: async (id, values) => (await api.put(`/admin/faqs/${id}`, values)).data,
  publish: async (id) => (await api.post(`/admin/faqs/${id}/publish`)).data,
  unpublish: async (id) => (await api.post(`/admin/faqs/${id}/unpublish`)).data,
  reorder: async (ids) => (await api.put('/admin/faqs/reorder', { ids })).data,
  revisions: async (id) => (await api.get(`/admin/faqs/${id}/revisions`)).data.revisions,
  remove: async (id) => (await api.delete(`/admin/faqs/${id}`)).data,
  starterPack: async () => (await api.post('/admin/faqs/starter-pack')).data,
}

export const adminPolicyService = {
  list: async () => (await api.get('/admin/policies')).data,
  get: async (slug) => (await api.get(`/admin/policies/${slug}`)).data,
  version: async (slug, version) => (await api.get(`/admin/policies/${slug}/versions/${version}`)).data.version,
  startDraft: async (slug) => (await api.post(`/admin/policies/${slug}/draft`)).data,
  saveDraft: async (slug, values) => (await api.put(`/admin/policies/${slug}/draft`, values)).data,
  publish: async (slug, effectiveAt) => (await api.post(`/admin/policies/${slug}/draft/publish`, { effective_at: effectiveAt })).data,
  discard: async (slug) => (await api.delete(`/admin/policies/${slug}/draft`)).data,
}
