// i-peso-frontend/src/services/staffService.js
// Staff accounts, roles and the org chart (Configuration → Staff Management).

import api from './api'

export const staffService = {
  // ── STAFF ─────────────────────────────────────────────────────
  getStaff: async () => {
    const { data } = await api.get('/admin/staff')
    return data
  },

  getOrgChart: async () => {
    const { data } = await api.get('/admin/staff/org-chart')
    return data
  },

  createStaff: async (payload) => {
    const { data } = await api.post('/admin/staff', payload)
    return data
  },

  updateStaff: async (id, payload) => {
    const { data } = await api.put(`/admin/staff/${id}`, payload)
    return data
  },

  deactivateStaff: async (id) => {
    const { data } = await api.post(`/admin/staff/${id}/deactivate`)
    return data
  },

  reactivateStaff: async (id) => {
    const { data } = await api.post(`/admin/staff/${id}/reactivate`)
    return data
  },

  // Emails a new temporary password (a fresh invite if they never set up).
  sendPassword: async (id) => {
    const { data } = await api.post(`/admin/staff/${id}/send-password`)
    return data
  },

  // ── ROLES ─────────────────────────────────────────────────────
  getRoles: async () => {
    const { data } = await api.get('/admin/roles')
    return data
  },

  createRole: async (payload) => {
    const { data } = await api.post('/admin/roles', payload)
    return data
  },

  updateRole: async (id, permissions) => {
    const { data } = await api.put(`/admin/roles/${id}`, { permissions })
    return data
  },

  deleteRole: async (id) => {
    const { data } = await api.delete(`/admin/roles/${id}`)
    return data
  },
}
