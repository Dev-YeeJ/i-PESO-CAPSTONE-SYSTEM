import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import VacanciesPage from '../VacanciesPage'
import * as employerService from '@/services/employerService'

vi.mock('@/services/employerService', () => ({
  getVacancies: vi.fn(),
  deleteVacancy: vi.fn(),
}))

const vacancy = {
  post_id: 7,
  job_title: 'Warehouse Staff',
  status: 'active',
  location: 'Urdaneta City',
  vacancies_count: 3,
  employment_type: 'permanent',
}

function renderPage() {
  return render(<MemoryRouter><VacanciesPage /></MemoryRouter>)
}

describe('employer VacanciesPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders published vacancies', async () => {
    employerService.getVacancies.mockResolvedValue({ data: [vacancy] })

    renderPage()

    expect(await screen.findByText('Warehouse Staff')).toBeInTheDocument()
  })

  it('shows an actionable empty state with a post-a-job link', async () => {
    employerService.getVacancies.mockResolvedValue({ data: [] })

    renderPage()

    expect(await screen.findByText('No vacancies posted yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /post a job/i })).toBeInTheDocument()
  })

  it('confirms deletion in an accessible dialog instead of window.confirm', async () => {
    employerService.getVacancies.mockResolvedValue({ data: [vacancy] })
    employerService.deleteVacancy.mockResolvedValue({})
    const confirmSpy = vi.spyOn(window, 'confirm')

    renderPage()

    await screen.findByText('Warehouse Staff')
    await userEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0])

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleName('Delete this vacancy?')
    expect(confirmSpy).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Delete vacancy' }))
    await waitFor(() => expect(employerService.deleteVacancy).toHaveBeenCalledWith(7))
  })
})
