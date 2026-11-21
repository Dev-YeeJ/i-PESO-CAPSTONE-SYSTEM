import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils'
import PlacementComplianceGrid from '../PlacementComplianceGrid'
import { summarizeCompliance } from '../complianceGrid'
import { getPlacementComplianceGrid, sendPlacementReminder } from '@/services/placementReportService'

vi.mock('@/services/placementReportService', () => ({
  getPlacementComplianceGrid: vi.fn(),
  sendPlacementReminder: vi.fn(),
}))

const grid = {
  year: 2026,
  months: [
    { month: 1, label: 'Jan', due_date: '2026-02-10' },
    { month: 2, label: 'Feb', due_date: '2026-03-10' },
    { month: 3, label: 'Mar', due_date: '2026-04-10' },
  ],
  rows: [
    {
      employer_id: 1,
      company_name: 'Steady Corp',
      missing: 0,
      cells: [
        { month: 1, state: 'approved', late: false, upload_id: 10 },
        { month: 2, state: 'nil', late: true, upload_id: 11 },
        { month: 3, state: 'due', late: false, upload_id: null },
      ],
    },
    {
      employer_id: 2,
      company_name: 'Quiet Corp',
      missing: 2,
      cells: [
        { month: 1, state: 'needs_revision', late: false, upload_id: 12 },
        { month: 2, state: 'overdue', late: false, upload_id: null },
        { month: 3, state: 'due', late: false, upload_id: null },
      ],
    },
  ],
}

describe('summarizeCompliance', () => {
  it('counts only months past their deadline and treats late submissions as not on time', () => {
    expect(summarizeCompliance(grid)).toEqual({ required: 4, onTime: 1, overdue: 1, rate: 25 })
  })

  it('has no rate when nothing has come due', () => {
    expect(summarizeCompliance({ rows: [] }).rate).toBeNull()
  })
})

describe('PlacementComplianceGrid', () => {
  beforeEach(() => {
    vi.mocked(getPlacementComplianceGrid).mockResolvedValue(grid)
    vi.mocked(sendPlacementReminder).mockResolvedValue({ message: 'Reminder sent to Quiet Corp for February 2026.' })
  })

  it('sends a reminder for an overdue month after confirming', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlacementComplianceGrid year={2026} onYearChange={() => {}} />)

    await user.click(await screen.findByRole('button', { name: /Quiet Corp, February 2026: Overdue\. Send reminder/ }))
    await user.click(screen.getByRole('button', { name: 'Send reminder' }))

    await waitFor(() => expect(sendPlacementReminder).toHaveBeenCalled())
    expect(vi.mocked(sendPlacementReminder).mock.calls[0][0]).toEqual({ employerId: 2, month: 2, year: 2026 })
  })

  it('does not offer a reminder for a month already submitted', async () => {
    renderWithProviders(<PlacementComplianceGrid year={2026} onYearChange={() => {}} />)

    expect(await screen.findByLabelText(/Steady Corp, January 2026: Approved$/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Steady Corp, January 2026/ })).not.toBeInTheDocument()
  })

  it('filters to employers with missing reports', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlacementComplianceGrid year={2026} onYearChange={() => {}} />)

    await screen.findByText('Steady Corp')
    await user.click(screen.getByRole('button', { name: 'Missing reports only' }))

    expect(screen.queryByText('Steady Corp')).not.toBeInTheDocument()
    expect(screen.getByText('Quiet Corp')).toBeInTheDocument()
  })
})
