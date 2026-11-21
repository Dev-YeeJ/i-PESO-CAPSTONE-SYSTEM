import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils'
import { useAuthStore } from '@/stores/authStore'
import { getApplicantCounts } from '@/services/employerService'
import EmployerLayout from '../EmployerLayout'

vi.mock('@/services/employerService', () => ({ getApplicantCounts: vi.fn() }))
vi.mock('@/components/shell/NotificationBell', () => ({ default: () => null }))
vi.mock('@/components/shell/ShellSearch', () => ({ default: () => null }))

const applicantsLink = () => screen.getByRole('link', { name: /^Applicants/ })

describe('EmployerLayout applicants badge', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { name: 'Acme Corp', verification_status: 'verified', employer: { company_name: 'Acme Corp' } },
    })
  })

  it('shows the total number of applicants, in gold while some wait for review', async () => {
    getApplicantCounts.mockResolvedValue({ new: 3, active: 5, total: 12 })
    renderWithProviders(<EmployerLayout />, { route: '/employer/dashboard' })

    const badge = await within(applicantsLink()).findByText('12')
    expect(badge).toHaveClass('bg-brand-gold')
    expect(applicantsLink()).toHaveAccessibleName('Applicants, 12 applicants, 3 new')
  })

  it('keeps showing the total in a quieter badge once every applicant is reviewed', async () => {
    getApplicantCounts.mockResolvedValue({ new: 0, active: 2, total: 7 })
    renderWithProviders(<EmployerLayout />, { route: '/employer/dashboard' })

    const badge = await within(applicantsLink()).findByText('7')
    expect(badge).toHaveClass('bg-white/15')
    expect(badge).not.toHaveClass('bg-brand-gold')
    expect(applicantsLink()).toHaveAccessibleName('Applicants, 7 applicants')
  })

  it('shows no badge before the first applicant arrives', async () => {
    getApplicantCounts.mockResolvedValue({ new: 0, active: 0, total: 0 })
    renderWithProviders(<EmployerLayout />, { route: '/employer/dashboard' })

    await vi.waitFor(() => expect(getApplicantCounts).toHaveBeenCalled())
    expect(within(applicantsLink()).queryByText('0')).not.toBeInTheDocument()
  })
})
