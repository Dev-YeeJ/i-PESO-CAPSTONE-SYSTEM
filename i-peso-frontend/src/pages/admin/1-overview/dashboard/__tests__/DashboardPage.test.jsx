import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from '../DashboardPage'
import { renderWithProviders } from '@/test/utils'
import { adminService } from '@/services/adminService'

vi.mock('@/services/adminService', () => ({
  adminService: { getDashboardStats: vi.fn() },
}))

const stats = {
  total_seekers: 1240,
  total_employers: 86,
  active_vacancies: 42,
  applications_this_month: 310,
  hired_this_month: 24,
  rejected_this_month: 12,
  profile_completion_rate: 63.5,
  pending_verifications: 4,
  open_programs: 3,
  upcoming_job_fairs: 1,
  recent_registrations: [],
  recent_applications: [],
}

describe('admin DashboardPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders KPI cards from real dashboard stats', async () => {
    adminService.getDashboardStats.mockResolvedValue(stats)

    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText('Operations Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Registered Seekers')).toBeInTheDocument()
    // 1,240 also appears in the Platform Composition bar, so allow multiple.
    expect(screen.getAllByText('1,240').length).toBeGreaterThan(0)
    expect(screen.getByText('Active Vacancies')).toBeInTheDocument()
    expect(screen.getAllByText('42').length).toBeGreaterThan(0)
    // hired / rejected breakdown on the applications KPI
    expect(screen.getByText(/24 hired/i)).toBeInTheDocument()
  })

  it('exposes keyboard-focusable metric tooltips (no bare title attributes)', async () => {
    adminService.getDashboardStats.mockResolvedValue(stats)

    renderWithProviders(<DashboardPage />)

    await screen.findByText('Registered Seekers')
    expect(screen.getByRole('button', { name: /how registered seekers is calculated/i })).toBeInTheDocument()
  })

  it('shows an error state with retry when stats fail to load', async () => {
    adminService.getDashboardStats.mockRejectedValue({ response: { data: { message: 'Stats unavailable.' } } })

    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText('Stats unavailable.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })
})
