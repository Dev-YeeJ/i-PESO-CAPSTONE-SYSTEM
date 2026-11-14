import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils'
import EmployerProfile from '../EmployerProfile'
import * as employerService from '@/services/employerService'
import * as employerProfileService from '@/services/employerProfileService'

vi.mock('@/services/employerService', () => ({ getProfile: vi.fn() }))
vi.mock('@/services/employerProfileService', () => ({ updateProfile: vi.fn(), uploadCompanyLogo: vi.fn() }))
vi.mock('@/services/employerFeedbackService', () => ({
  employerFeedbackService: {
    getReviews: vi.fn().mockResolvedValue({
      summary: { min_reviews: 3, recruitment: { reviewers: 0, enough: false }, employment: { reviewers: 0, enough: false } },
      counts: {},
    }),
  },
}))

const employer = {
  employer_id: 1,
  email: 'hr@ricemill.test',
  company_type: 'corporation',
  company_name: 'Urdaneta Rice Mill Corp.',
  trade_name: null,
  industry: ['Manufacturing'],
  company_size: 'small',
  company_description: '',
  company_logo_url: null,
  representative_name: 'Ana Reyes',
  representative_designation: 'HR Manager',
  mobile_number: '09171234567',
  representative_contact_number: null,
  city_municipality: 'Urdaneta City',
  verification_status: 'verified',
  verified_at: '2026-11-01T00:00:00Z',
}

describe('EmployerProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    employerService.getProfile.mockResolvedValue({ employer, documents: [], required_documents: [] })
  })

  it('shows the company and what is missing from the profile', async () => {
    renderWithProviders(<EmployerProfile />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Urdaneta Rice Mill Corp.' })).toBeInTheDocument()
    expect(screen.getByText('Verified by PESO')).toBeInTheDocument()
    expect(screen.getByText(/4 of 6 done/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add company logo/i })).toBeInTheDocument()
  })

  it('opens the logo upload from the hero', async () => {
    renderWithProviders(<EmployerProfile />)

    await userEvent.click(await screen.findByRole('button', { name: 'Add a company logo' }))
    expect(await screen.findByRole('dialog', { name: 'Company logo' })).toBeInTheDocument()
  })

  it('checks the mobile number before saving, then saves valid changes', async () => {
    employerProfileService.updateProfile.mockResolvedValue({ employer: { ...employer, mobile_number: '09998887777' } })
    renderWithProviders(<EmployerProfile />)
    await userEvent.click(await screen.findByRole('button', { name: /edit profile/i }))

    const sheet = await screen.findByRole('dialog', { name: 'Edit company profile' })
    const mobile = within(sheet).getByLabelText('Mobile number')
    await userEvent.clear(mobile)
    await userEvent.type(mobile, '12345')
    await userEvent.click(within(sheet).getByRole('button', { name: /save changes/i }))

    expect(await within(sheet).findByText('Use 09XXXXXXXXX or +639XXXXXXXXX.')).toBeInTheDocument()
    expect(employerProfileService.updateProfile).not.toHaveBeenCalled()

    await userEvent.clear(mobile)
    await userEvent.type(mobile, '09998887777')
    await userEvent.click(within(sheet).getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(employerProfileService.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ mobile_number: '09998887777', industry: ['Manufacturing'] }),
    ))
    // The address wasn't touched (and this older account's address is incomplete),
    // so it is neither required nor sent.
    expect(employerProfileService.updateProfile.mock.calls[0][0]).not.toHaveProperty('province')
    expect(employerProfileService.updateProfile.mock.calls[0][0]).not.toHaveProperty('house_unit_street')
  })

  it('lets the employer edit their business address', async () => {
    renderWithProviders(<EmployerProfile />)

    expect(await screen.findByText(/you can update your address yourself/i)).toBeInTheDocument()
    expect(screen.queryByText(/TIN and address match your permits/i)).not.toBeInTheDocument()

    const addressRow = screen.getByText('Business address', { selector: 'dt' }).parentElement
    await userEvent.click(within(addressRow).getByRole('button', { name: /edit/i }))
    const sheet = await screen.findByRole('dialog', { name: 'Edit company profile' })
    expect(within(sheet).getByText('Business address')).toBeInTheDocument()
    expect(within(sheet).getByText('Company office address')).toBeInTheDocument()
    expect(within(sheet).queryByText(/TIN and address are checked/i)).not.toBeInTheDocument()
  })
})
