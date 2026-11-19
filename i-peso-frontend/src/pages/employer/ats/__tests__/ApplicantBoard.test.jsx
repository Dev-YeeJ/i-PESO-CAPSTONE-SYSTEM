import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils'
import ApplicantBoard from '../ApplicantBoard'
import { getVacancyApplications } from '@/services/employerApplicationService'

vi.mock('@/services/employerApplicationService', () => ({ getVacancyApplications: vi.fn() }))

const card = (id, name, status) => ({
  apply_id: id,
  status,
  match_percentage: '82.5',
  applied_at: '2026-11-01T00:00:00Z',
  seeker: { name, address: 'Urdaneta City' },
})

const byStatus = {
  pending: [card(1, 'Ana Santos', 'pending')],
  hired: [card(2, 'Ben Cruz', 'hired')],
}

describe('ApplicantBoard', () => {
  beforeEach(() => {
    vi.mocked(getVacancyApplications).mockImplementation(async (_id, { status }) => {
      const data = byStatus[status] ?? []
      return { data, total: data.length }
    })
  })

  it('moves an applicant with the "Move to" menu as well as by dragging', async () => {
    const onMove = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<ApplicantBoard vacancyId="9" sortBy="match_score" sortDir="desc" counts={{}} onMove={onMove} onOpen={() => {}} />)

    await user.selectOptions(await screen.findByRole('combobox', { name: 'Move Ana Santos to' }), 'shortlisted')
    expect(onMove).toHaveBeenCalledWith(expect.objectContaining({ apply_id: 1 }), 'shortlisted')
    expect(screen.getByRole('button', { name: 'Drag Ana Santos to another stage' })).toBeInTheDocument()
  })

  it('keeps applicants in a final stage where they are', async () => {
    renderWithProviders(<ApplicantBoard vacancyId="9" sortBy="match_score" sortDir="desc" counts={{}} onMove={() => {}} onOpen={() => {}} />)

    expect(await screen.findByText('Ben Cruz')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Move Ben Cruz to' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Drag Ben Cruz to another stage' })).not.toBeInTheDocument()
  })

  it('does not offer moving back to the inbox', async () => {
    renderWithProviders(<ApplicantBoard vacancyId="9" sortBy="match_score" sortDir="desc" counts={{}} onMove={() => {}} onOpen={() => {}} />)

    const menu = await screen.findByRole('combobox', { name: 'Move Ana Santos to' })
    const options = Array.from(menu.querySelectorAll('option')).map((o) => o.textContent)
    expect(options).not.toContain('Inbox')
    expect(options).toContain('Hired')
  })
})
