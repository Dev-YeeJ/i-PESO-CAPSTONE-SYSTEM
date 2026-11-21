import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils'
import { adminService } from '@/services/adminService'
import JobSeekerDetailPage from '../JobSeekerDetailPage'

vi.mock('@/services/adminService', () => ({
  adminService: { getSeekerDetail: vi.fn(), getSeekerProfileImage: vi.fn() },
}))
vi.mock('@/pages/admin/_components', () => ({ DownloadNSRPButton: () => null }))
vi.mock('../components/WorkerFeedbackCard', () => ({ default: () => null }))
vi.mock('@/components/safety/SafetyHistoryCard', () => ({ default: () => null }))

const seeker = (disabilities) => ({
  seeker_id: 7,
  first_name: 'Maria',
  last_name: 'Santos',
  profile: { seeker_id: 7, full_name: 'Maria Santos' },
  disabilities,
})

const renderPage = () => renderWithProviders(
  <Routes><Route path="/admin/job-seekers/:id" element={<JobSeekerDetailPage />} /></Routes>,
  { route: '/admin/job-seekers/7' },
)

describe('JobSeekerDetailPage disability status', () => {
  beforeEach(() => {
    adminService.getSeekerProfileImage.mockRejectedValue(new Error('no photo'))
  })

  it('shows each declared disability with the seeker’s own description, as written', async () => {
    adminService.getSeekerDetail.mockResolvedValue(seeker([
      { type: 'physical', details: 'left leg amputation, uses crutches' },
      { type: 'visual', details: null },
    ]))
    renderPage()

    const physical = await screen.findByText('Physical')
    expect(physical.closest('li')).toHaveTextContent('Physical: left leg amputation, uses crutches')
    expect(screen.getByText('Visual').closest('li')).toHaveTextContent(/^Visual$/)
  })

  it('says none declared when the seeker has no disability', async () => {
    adminService.getSeekerDetail.mockResolvedValue(seeker([]))
    renderPage()

    expect(await screen.findByText('None declared')).toBeInTheDocument()
  })
})
