import { describe, expect, it } from 'vitest'
import { companyLogoUrl } from '../companyLogoUrl'

describe('companyLogoUrl', () => {
  it('uses the API-provided absolute URL unchanged', () => {
    const url = 'https://api.example.test/storage/employer_logos/logo.png'

    expect(companyLogoUrl(url, 'https://api.example.test/api')).toBe(url)
  })

  it('builds a storage URL for legacy logo paths', () => {
    expect(companyLogoUrl('employer_logos/logo.png', 'https://api.example.test/api'))
      .toBe('https://api.example.test/storage/employer_logos/logo.png')
  })

  it('does not duplicate the storage prefix', () => {
    expect(companyLogoUrl('/storage/employer_logos/logo.png', 'https://api.example.test/api'))
      .toBe('https://api.example.test/storage/employer_logos/logo.png')
  })
})
