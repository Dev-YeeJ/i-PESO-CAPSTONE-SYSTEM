import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils'
import JobPostingWizard from '../JobPostingWizard'
import * as employerService from '@/services/employerService'

vi.mock('@/services/employerService', async (importOriginal) => ({
  ...(await importOriginal()),
  getVacancy: vi.fn(),
  createVacancy: vi.fn(),
  getMatchEstimate: vi.fn(),
}))

// The signed-out test store has no user id, so drafts use the "me" key.
const DRAFT_KEY = 'ipeso.jobDraft.me'

const renderWizard = (route = '/employer/post-job') => renderWithProviders(
  <Routes><Route path="/employer/post-job" element={<JobPostingWizard />} /></Routes>,
  { route },
)

const titleInput = () => screen.getByPlaceholderText('e.g. Accounting Staff')

describe('JobPostingWizard drafts and duplicates', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => window.localStorage.clear())

  it('saves an unfinished post on this device after a short pause', async () => {
    const user = userEvent.setup()
    renderWizard()

    await user.type(titleInput(), 'Baker')

    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(DRAFT_KEY))?.form?.job_title).toBe('Baker'), { timeout: 3000 })
    expect(await screen.findByText(/Draft saved on this device/)).toBeInTheDocument()
  })

  it('picks a saved draft back up, and Start over clears it', async () => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ form: { job_title: 'Pastry Chef' }, step: 1, savedAt: '2026-11-19T08:00:00Z' }))
    const user = userEvent.setup()
    renderWizard()

    expect(titleInput()).toHaveValue('Pastry Chef')
    expect(screen.getByText(/Picked up where you left off/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Start over' }))
    expect(titleInput()).toHaveValue('')
    expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull()
  })

  it('pre-fills a copy of an existing vacancy without its deadline', async () => {
    vi.mocked(employerService.getVacancy).mockResolvedValue({
      post_id: 5,
      job_title: 'Store Supervisor',
      vacancies_count: 2,
      general_term: 'retail work',
      required_skills: ['Inventory'],
      application_deadline: '2026-10-01',
      minimum_education: 'College Graduate',
    })
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ form: { job_title: 'Old draft' }, step: 1, savedAt: '2026-11-19T08:00:00Z' }))

    renderWizard('/employer/post-job?from=5')

    expect(await screen.findByText(/Copied from/)).toBeInTheDocument()
    expect(titleInput()).toHaveValue('Store Supervisor')
    expect(screen.getByDisplayValue('2')).toBeInTheDocument()
    expect(employerService.getVacancy).toHaveBeenCalledWith('5')
  })
})
