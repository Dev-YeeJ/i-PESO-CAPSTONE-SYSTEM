import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CompanyLogo from '../CompanyLogo'

describe('CompanyLogo', () => {
  it('shows the company logo from storage', () => {
    render(<CompanyLogo logo="company_logos/rice.png" name="Rice Mill" />)

    expect(screen.getByRole('img', { name: 'Rice Mill logo' }).getAttribute('src')).toMatch(/\/storage\/company_logos\/rice\.png$/)
  })

  it('falls back to the building icon when the logo fails to load', () => {
    render(<CompanyLogo logo="company_logos/missing.png" name="Rice Mill" />)

    fireEvent.error(screen.getByRole('img', { name: 'Rice Mill logo' }))

    expect(screen.queryByRole('img', { name: 'Rice Mill logo' })).not.toBeInTheDocument()
    expect(screen.getByTestId('company-logo-fallback')).toBeInTheDocument()
  })

  it('shows the building icon when the company has no logo', () => {
    render(<CompanyLogo logo={null} name="Rice Mill" />)

    expect(screen.getByTestId('company-logo-fallback')).toBeInTheDocument()
  })
})
