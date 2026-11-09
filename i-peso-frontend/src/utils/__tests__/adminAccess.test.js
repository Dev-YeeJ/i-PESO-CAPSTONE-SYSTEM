import { describe, expect, it } from 'vitest'
import { accessLevel, canManage, canOpen, canOpenPath, moduleForPath } from '../adminAccess'

const intern = { role: 'administrator', access: { constituent_crm: 'view', employment_hub: 'view' } }
const aide = { access: { constituent_crm: 'manage', employment_hub: 'manage', government_dole: 'manage', system_reports: 'manage' } }
const sleo = { is_system_administrator: true, access: {} }

describe('moduleForPath', () => {
  it('maps admin pages, including detail pages, to their module', () => {
    expect(moduleForPath('/admin/job-seekers')).toBe('constituent_crm')
    expect(moduleForPath('/admin/job-fairs/12/check-in')).toBe('government_dole')
    expect(moduleForPath('/admin/activity-logs')).toBe('activity_logs')
    expect(moduleForPath('/admin/staff')).toBe('configuration')
  })

  it('leaves the dashboard and set-password open to everyone', () => {
    expect(moduleForPath('/admin/dashboard')).toBeNull()
    expect(moduleForPath('/admin/set-password')).toBeNull()
  })

  it('does not match a path that only shares a prefix', () => {
    expect(moduleForPath('/admin/employers-archive')).toBeNull()
  })
})

describe('access levels', () => {
  it('lets a view-only intern open but not manage', () => {
    expect(accessLevel(intern, 'employment_hub')).toBe('view')
    expect(canOpen(intern, 'employment_hub')).toBe(true)
    expect(canManage(intern, 'employment_hub')).toBe(false)
    expect(canOpen(intern, 'government_dole')).toBe(false)
  })

  it('keeps the activity log and staff pages from aides', () => {
    expect(canOpenPath(aide, '/admin/activity-logs')).toBe(false)
    expect(canOpenPath(aide, '/admin/staff')).toBe(false)
    expect(canOpenPath(aide, '/admin/job-fairs')).toBe(true)
  })

  it('gives the system administrator everything', () => {
    expect(canManage(sleo, 'configuration')).toBe(true)
    expect(canOpenPath(sleo, '/admin/activity-logs')).toBe(true)
  })

  it('hides nothing for a session from before access levels existed', () => {
    expect(canOpen({ role: 'administrator' }, 'configuration')).toBe(true)
  })
})
