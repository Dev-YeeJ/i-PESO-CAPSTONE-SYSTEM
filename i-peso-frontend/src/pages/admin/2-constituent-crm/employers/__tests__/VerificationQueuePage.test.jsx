import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import VerificationQueuePage from '../VerificationQueuePage'
import { renderWithProviders } from '@/test/utils'
import { adminService } from '@/services/adminService'

vi.mock('@/services/adminService', () => ({
  adminService: { getPendingEmployers: vi.fn() },
}))

const employers = [
  { employer_id: 1, company_name: 'Awaiting Co', email: 'a@co.ph', all_required_approved: false, approved_required_documents_count: 1, required_documents_count: 3, created_at: '2026-06-01T00:00:00Z' },
  { employer_id: 2, company_name: 'Ready Co', email: 'r@co.ph', all_required_approved: true, approved_required_documents_count: 3, required_documents_count: 3, created_at: '2026-06-02T00:00:00Z' },
]

describe('VerificationQueuePage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists pending employers with a ready/awaiting summary', async () => {
    adminService.getPendingEmployers.mockResolvedValue({ employers })

    renderWithProviders(<VerificationQueuePage />)

    expect(await screen.findByText('Ready Co')).toBeInTheDocument()
    expect(screen.getByText('Awaiting Co')).toBeInTheDocument()
    // "ready for decision" appears in both the summary and the card badge.
    expect(screen.getAllByText(/ready for decision/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/awaiting documents/i)).toBeInTheDocument()
  })

  it('orders "ready for decision" employers before those awaiting documents', async () => {
    adminService.getPendingEmployers.mockResolvedValue({ employers })

    renderWithProviders(<VerificationQueuePage />)

    await screen.findByText('Ready Co')
    // Company names sit at level 3, below the "Pending applications" section heading.
    const names = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(names.indexOf('Ready Co')).toBeLessThan(names.indexOf('Awaiting Co'))
  })

  it('exposes an accessible document-completeness progressbar', async () => {
    adminService.getPendingEmployers.mockResolvedValue({ employers })

    renderWithProviders(<VerificationQueuePage />)

    await screen.findByText('Ready Co')
    const bars = screen.getAllByRole('progressbar')
    expect(bars.length).toBeGreaterThan(0)
    expect(bars.some((bar) => bar.getAttribute('aria-valuenow') === '100')).toBe(true)
  })

  it('shows a positive empty state when the queue is clear', async () => {
    adminService.getPendingEmployers.mockResolvedValue({ employers: [] })

    renderWithProviders(<VerificationQueuePage />)

    expect(await screen.findByText('Employer queue is clear')).toBeInTheDocument()
  })

  it('shows an error state with retry when loading fails', async () => {
    adminService.getPendingEmployers.mockRejectedValue({ response: { data: { message: 'Queue unavailable.' } } })

    renderWithProviders(<VerificationQueuePage />)

    expect(await screen.findByText('Queue unavailable.')).toBeInTheDocument()
    const retry = screen.getByRole('button', { name: /try again/i })
    await userEvent.click(retry)
    await waitFor(() => expect(adminService.getPendingEmployers).toHaveBeenCalledTimes(2))
  })
})
