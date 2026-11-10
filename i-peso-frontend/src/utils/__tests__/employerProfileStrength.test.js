import { describe, expect, it } from 'vitest'
import { industriesOf, profileStrength, sizeLabel } from '../employerProfileStrength'

const complete = {
  company_logo_url: 'https://example.test/logo.png',
  company_description: 'We mill and deliver rice across Urdaneta City and nearby towns, and we train every new hire on the job.',
  industry: ['Manufacturing'],
  company_size: 'small',
  representative_name: 'Ana Reyes',
  representative_designation: 'HR Manager',
  mobile_number: '09171234567',
}

describe('profileStrength', () => {
  it('is 100% when every item is filled in', () => {
    expect(profileStrength(complete)).toMatchObject({ done: 6, total: 6, percent: 100 })
  })

  it('lists what is missing and where to fix it', () => {
    const result = profileStrength({ ...complete, company_logo_url: null, company_description: 'Too short.' })
    expect(result.percent).toBe(67)
    expect(result.items.filter((item) => !item.done).map((item) => item.action ?? item.field)).toEqual(['logo', 'company_description'])
  })

  it('treats a blank representative position as incomplete', () => {
    expect(profileStrength({ ...complete, representative_designation: '  ' }).items.find((item) => item.key === 'representative').done).toBe(false)
  })
})

describe('helpers', () => {
  it('reads industries stored as an array or a string', () => {
    expect(industriesOf({ industry: 'Retail & Commerce' })).toEqual(['Retail & Commerce'])
    expect(industriesOf({ industry: null })).toEqual([])
  })

  it('labels company sizes', () => {
    expect(sizeLabel('medium')).toBe('Medium · 100–199 employees')
    expect(sizeLabel(undefined)).toBeNull()
  })
})
