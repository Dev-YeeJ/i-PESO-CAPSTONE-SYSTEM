import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EmployerApplicantProfilePage from '../EmployerApplicantProfilePage'
import { getEmployerApplicationDetail } from '@/services/employerApplicationService'

vi.mock('@/services/employerApplicationService', () => ({
  getEmployerApplicationDetail: vi.fn(),
  getApplicantResume: vi.fn(),
}))
vi.mock('@/components/safety/ReportApplicantButton', () => ({ default: () => null }))
vi.mock('@/components/reviews/WorkerRatingBadge', () => ({ default: () => null }))
vi.mock('../ApplicantAvatar', () => ({ default: () => null }))
vi.mock('../InterviewSummary', () => ({ default: () => null }))

// Renders the page inside a small app with the calendar and Applicants routes,
// starting from `entries` (the history the employer has in this tab).
function renderAt(entries, initialIndex = entries.length - 1) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={entries} initialIndex={initialIndex}>
        <Routes>
          <Route path="/employer/calendar" element={<p>Calendar page</p>} />
          <Route path="/employer/ats" element={<p>Applicants page</p>} />
          <Route path="/employer/ats/applicant/:applicationId" element={<EmployerApplicantProfilePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EmployerApplicantProfilePage back link', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getEmployerApplicationDetail.mockResolvedValue({
      application: { apply_id: 5, status: 'interview', job_title: 'Accounting Staff', seeker: { first_name: 'Jamaica', last_name: 'Comilang' }, timeline: [] },
      worker_rating: null,
    })
  })

  it('returns to the interview calendar when the applicant was opened from it', async () => {
    renderAt(['/employer/calendar', { pathname: '/employer/ats/applicant/5', state: { from: 'calendar' } }])

    await userEvent.click(await screen.findByRole('link', { name: /Back to interview calendar/ }))
    expect(screen.getByText('Calendar page')).toBeInTheDocument()
  })

  it('still goes to Applicants when opened from anywhere else', async () => {
    renderAt(['/employer/ats', '/employer/ats/applicant/5'])

    const back = await screen.findByRole('link', { name: /Back to ATS/ })
    expect(screen.queryByText(/Back to interview calendar/)).not.toBeInTheDocument()
    await userEvent.click(back)
    expect(screen.getByText('Applicants page')).toBeInTheDocument()
  })
})
