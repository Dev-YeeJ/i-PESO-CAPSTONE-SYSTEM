import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SafetyReportDetailPage from '../SafetyReportDetailPage'
import { renderWithProviders } from '@/test/utils'
import { adminSafetyReportService } from '@/services/safetyReportService'

vi.mock('react-router-dom', async (importOriginal) => ({ ...(await importOriginal()), useParams: () => ({ id: '7' }) }))
vi.mock('@/services/safetyReportService', async (importOriginal) => ({
  ...(await importOriginal()),
  adminSafetyReportService: { get: vi.fn(), options: vi.fn(), update: vi.fn(), recordAction: vi.fn(), addNote: vi.fn(), openAttachment: vi.fn() },
}))

const report = (overrides = {}) => ({
  id: 7,
  case_number: 'RPT-2026-00007',
  created_at: '2026-11-20T02:00:00Z',
  updated_at: '2026-11-20T02:00:00Z',
  category_label: 'Fake or misleading job vacancy',
  description: 'The address on the vacancy is a vacant lot.',
  status: 'under_review',
  status_label: 'Under Review',
  subject_type: 'employer',
  can_manage: true,
  attachments: [],
  timeline: [],
  reporter: { type: 'job_seeker', type_label: 'Job seeker', id: 3, name: 'Ana Cruz', contact_hidden: false, email: 'ana@example.test' },
  subject: {
    type: 'employer', id: 46, name: 'Rice Mill Co', exists: true, restriction: null, reports_about: 1, open_reports_about: 1, other_cases: [],
    vacancies: [
      { post_id: 11, job_title: 'Machine Operator', status: 'active', on_hold: false },
      { post_id: 12, job_title: 'Cashier', status: 'closed', on_hold: true },
    ],
  },
  vacancy: { post_id: 11, job_title: 'Machine Operator', status: 'active', on_hold: false },
  available_actions: [
    { value: 'warning', label: 'Issue a warning or notice', notifies: true },
    { value: 'hide_vacancy', label: 'Temporarily hide a job vacancy', notifies: true, needs_vacancy: true, severe: true },
    { value: 'restore_vacancy', label: 'Restore a hidden job vacancy', notifies: true, needs_vacancy: true },
  ],
  ...overrides,
})

describe('SafetyReportDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    adminSafetyReportService.options.mockResolvedValue({
      statuses: [{ value: 'under_review', label: 'Under Review' }, { value: 'action_required', label: 'Investigation / Action Required' }],
      dismissal_reasons: [],
    })
  })

  it('has no priority or assignment fields, and saving sends only the review', async () => {
    adminSafetyReportService.get.mockResolvedValue(report())
    adminSafetyReportService.update.mockResolvedValue({ message: 'Case updated.', report: report({ status: 'action_required', updated_at: '2026-11-20T03:00:00Z' }) })
    renderWithProviders(<SafetyReportDetailPage />)

    expect(await screen.findByText('Case RPT-2026-00007')).toBeInTheDocument()
    expect(screen.queryByText(/priority/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/assigned to/i)).not.toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'action_required')
    await userEvent.click(screen.getByRole('button', { name: 'Save review' }))

    const payload = adminSafetyReportService.update.mock.calls[0][1]
    expect(payload.status).toBe('action_required')
    expect(payload).not.toHaveProperty('priority')
    expect(payload).not.toHaveProperty('assigned_admin_id')
    expect(payload).not.toHaveProperty('unassign')
  })

  it('re-picks the vacancy when the action changes instead of sending one the list no longer shows', async () => {
    adminSafetyReportService.get.mockResolvedValue(report())
    adminSafetyReportService.recordAction.mockResolvedValue({ message: 'Restore a hidden job vacancy — recorded.', report: report() })
    renderWithProviders(<SafetyReportDetailPage />)
    await screen.findByText('Case RPT-2026-00007')

    const action = screen.getByLabelText('Action')
    await userEvent.selectOptions(action, 'hide_vacancy')
    expect(screen.getByLabelText('Vacancy')).toHaveValue('11')

    // The reported vacancy is not on hold, so Restore starts with nothing chosen.
    await userEvent.selectOptions(action, 'restore_vacancy')
    expect(screen.getByLabelText('Vacancy')).toHaveValue('')
    await userEvent.type(screen.getByLabelText('Justification (internal)'), 'Employer confirmed the real address in person.')
    await userEvent.type(screen.getByLabelText(/Notice to/), 'You may now reopen the vacancy. Thank you.')
    await userEvent.click(screen.getByRole('button', { name: 'Record action' }))
    expect(screen.getByText('Choose the vacancy.')).toBeInTheDocument()
    expect(adminSafetyReportService.recordAction).not.toHaveBeenCalled()

    await userEvent.selectOptions(screen.getByLabelText('Vacancy'), '12')
    await userEvent.click(screen.getByRole('button', { name: 'Record action' }))
    expect(adminSafetyReportService.recordAction).toHaveBeenCalledWith(7, expect.objectContaining({ action: 'restore_vacancy', post_id: 12 }))
  })
})
