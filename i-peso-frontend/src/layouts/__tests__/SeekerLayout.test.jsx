import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '@/test/utils'
import { useAuthStore } from '@/stores/authStore'
import SeekerLayout from '../SeekerLayout'

vi.mock('@/components/shell/NotificationBell', () => ({ default: () => null }))
vi.mock('@/components/shell/ShellSearch', () => ({ default: () => null }))
vi.mock('@/hooks/useSeekerPhotoUrl', () => ({ useSeekerPhotoUrl: () => null }))

const renderAt = (route) => renderWithProviders(
  <Routes>
    <Route path="/seeker" element={<SeekerLayout />}>
      <Route path="dashboard" element={<p>Dashboard content</p>} />
      <Route path="job-map" element={<p>Map content</p>} />
      <Route path="job-map/:jobId" element={<p>Map content</p>} />
    </Route>
  </Routes>,
  { route },
)

describe('SeekerLayout page area', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { name: 'Juan Dela Cruz', role: 'seeker' } })
  })

  it.each(['/seeker/job-map', '/seeker/job-map/12'])('gives %s the whole screen under the header, ending above the phone bottom bar', (route) => {
    renderAt(route)
    const main = screen.getByText('Map content').closest('main')
    const column = main.parentElement

    // A screen-tall column (dvh where supported, so mobile address bars don't hide the bottom)...
    expect(column).toHaveClass('flex', 'flex-col', 'h-screen', 'supports-[height:100dvh]:h-dvh')
    // ...whose page area takes what's left, without padding or its own page scroll...
    expect(main).toHaveClass('min-h-0', 'flex-1', 'overflow-hidden')
    expect(main).not.toHaveClass('pb-28')
    // ...and the phone bottom bar sits in that column, not floating over the map.
    const nav = screen.getByRole('navigation', { name: 'Primary mobile navigation' })
    expect(column).toContainElement(nav)
    expect(nav).toHaveClass('relative')
    expect(nav).not.toHaveClass('fixed')
  })

  it('keeps the usual padded, scrolling page and floating bottom bar everywhere else', () => {
    renderAt('/seeker/dashboard')
    const main = screen.getByText('Dashboard content').closest('main')

    expect(main).toHaveClass('px-3', 'pb-28')
    expect(main.parentElement).not.toHaveClass('h-screen')
    expect(screen.getByRole('navigation', { name: 'Primary mobile navigation' })).toHaveClass('fixed')
  })
})
