import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EmployerDetailPage from '../EmployerDetailPage'
import { renderWithProviders } from '@/test/utils'
import { adminService } from '@/services/adminService'
import { useAuthStore } from '@/stores/authStore'

vi.mock('@/services/adminService', () => ({
  adminService: { getEmployerDetail: vi.fn(), getEmployerDocument: vi.fn() },
}))
vi.mock('@/components/safety/SafetyHistoryCard', () => ({ default: () => null }))

const doc = (overrides) => ({
  employer_id: 46,
  original_filename: 'file.png',
  uploaded_at: '2026-11-12T00:00:00Z',
  verification_status: 'pending',
  admin_notes: null,
  expiration_date: null,
  viewed_at: null,
  staff_viewed_at: null,
  viewed_by_me_at: null,
  viewed_by: [],
  ...overrides,
})

const employer = (documents) => ({
  employer_id: 46,
  company_name: 'Rice Mill Co',
  verification_status: 'pending',
  required_documents: ['mayors_permit', 'government_id'],
  verification_documents: documents,
})

describe('EmployerDetailPage document viewed state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: { admin_id: 2, first_name: 'Officer', position: 'staff' } })
  })

  it('does not show a document as viewed because a colleague opened it', async () => {
    adminService.getEmployerDetail.mockResolvedValue(employer([
      // Opened by another staff account — the shared viewed_at is set, but not by me.
      doc({ document_id: 1, document_type: 'mayors_permit', viewed_at: '2026-11-12T01:00:00Z', staff_viewed_at: '2026-11-12T01:00:00Z', viewed_by: [{ admin_id: 9, name: 'Maria Santos', viewed_at: '2026-11-12T01:00:00Z' }] }),
      doc({ document_id: 2, document_type: 'government_id', viewed_by_me_at: '2026-11-12T02:00:00Z' }),
    ]))

    renderWithProviders(<EmployerDetailPage />)

    expect(await screen.findByText('Not yet viewed by you')).toBeInTheDocument()
    expect(screen.getByText('Opened by Maria Santos')).toBeInTheDocument()
    expect(screen.getByText('Viewed by you')).toBeInTheDocument()
    // The finalize hint names exactly the document this account hasn't opened.
    expect(screen.getByText(/Open Mayor's Permit before completing the review/)).toBeInTheDocument()
  })

  it('flips to viewed once this account opens the document', async () => {
    adminService.getEmployerDetail.mockResolvedValue(employer([
      doc({ document_id: 1, document_type: 'mayors_permit' }),
      doc({ document_id: 2, document_type: 'government_id', viewed_by_me_at: '2026-11-12T02:00:00Z' }),
    ]))
    adminService.getEmployerDocument.mockResolvedValue(new Blob(['x'], { type: 'application/pdf' }))
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:preview')
    globalThis.URL.revokeObjectURL = vi.fn()

    renderWithProviders(<EmployerDetailPage />)

    expect(await screen.findByText('Not yet viewed by you')).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: /^view$/i })[0])

    expect(await screen.findAllByText('Viewed by you')).toHaveLength(2)
    expect(screen.queryByText('Not yet viewed by you')).not.toBeInTheDocument()
  })

  it('marks the Government ID as required', async () => {
    adminService.getEmployerDetail.mockResolvedValue(employer([
      doc({ document_id: 1, document_type: 'mayors_permit' }),
    ]))

    renderWithProviders(<EmployerDetailPage />)

    expect(await screen.findByText('Government ID')).toBeInTheDocument()
    expect(screen.getAllByText('Required')).toHaveLength(2)
    expect(screen.getByText('Not submitted')).toBeInTheDocument()
  })
})
