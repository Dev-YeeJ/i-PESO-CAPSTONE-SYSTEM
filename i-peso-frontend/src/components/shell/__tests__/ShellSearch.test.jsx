import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LayoutDashboard } from 'lucide-react'
import { renderWithProviders } from '@/test/utils'
import ShellSearch from '../ShellSearch'
import api from '@/services/api'

vi.mock('@/services/api', () => ({ default: { get: vi.fn() } }))

const groups = [{ heading: 'Overview', items: [{ to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard }] }]

function renderSearch(props = {}) {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/dashboard" element={<ShellSearch groups={groups} {...props} />} />
      <Route path="/admin/job-seekers/:id" element={<p>Seeker detail page</p>} />
    </Routes>,
    { route: '/admin/dashboard' },
  )
}

describe('ShellSearch', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.get).mockResolvedValue({
      data: { groups: [{ key: 'seekers', heading: 'Job seekers', items: [{ type: 'seeker', id: 7, title: 'Ana Santos', subtitle: 'ana@example.test' }] }] },
    })
  })

  it('finds records through the portal search API and opens the one picked', async () => {
    const user = userEvent.setup()
    renderSearch({ recordPortal: 'admin' })

    await user.click(screen.getByRole('button', { name: 'Search (Ctrl+K)' }))
    await user.type(screen.getByRole('combobox'), 'ana')

    await user.click(await screen.findByText('Ana Santos'))
    expect(await screen.findByText('Seeker detail page')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/admin/search', expect.objectContaining({ params: { q: 'ana' } }))
  })

  it('only filters pages when no record portal is given', async () => {
    const user = userEvent.setup()
    renderSearch()

    await user.click(screen.getByRole('button', { name: 'Search pages (Ctrl+K)' }))
    await user.type(screen.getByRole('combobox'), 'dash')

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    await user.clear(screen.getByRole('combobox'))
    await user.type(screen.getByRole('combobox'), 'zzz')
    expect(screen.getByText('No page matches that.')).toBeInTheDocument()
    await waitFor(() => expect(api.get).not.toHaveBeenCalled())
  })
})
