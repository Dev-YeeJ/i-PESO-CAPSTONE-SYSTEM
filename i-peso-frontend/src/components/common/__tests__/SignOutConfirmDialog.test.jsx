import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import SignOutConfirmDialog from '../SignOutConfirmDialog'

vi.mock('@/services/authService', () => ({ authService: { logout: vi.fn() } }))

function renderSignOut(startPath) {
  const router = createMemoryRouter([
    { path: '/admin/dashboard', element: <SignOutConfirmDialog open onOpenChange={() => {}} /> },
    { path: '/seeker/dashboard', element: <SignOutConfirmDialog open onOpenChange={() => {}} /> },
    { path: '/administrator', element: <h1>Staff sign in</h1> },
    { path: '/login', element: <h1>Public sign in</h1> },
    { path: '/', element: <h1>Landing page</h1> },
  ], { initialEntries: [startPath] })
  render(<RouterProvider router={router} />)
  return router
}

describe('signing out', () => {
  beforeEach(() => {
    authService.logout.mockReset().mockResolvedValue()
  })

  it('sends PESO staff and admins back to the staff sign-in, not the public site', async () => {
    useAuthStore.setState({ user: { role: 'administrator', name: 'PESO Office Manager' }, token: 't', isAuthenticated: true })
    const router = renderSignOut('/admin/dashboard')

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: 'Staff sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/administrator')
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('sends job seekers and employers to the public sign-in', async () => {
    useAuthStore.setState({ user: { role: 'seeker', name: 'Juan' }, token: 't', isAuthenticated: true })
    renderSignOut('/seeker/dashboard')

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: 'Public sign in' })).toBeInTheDocument()
  })

  it('still lands staff on the staff sign-in when the server sign-out call fails', async () => {
    authService.logout.mockRejectedValue(new Error('offline'))
    useAuthStore.setState({ user: { role: 'administrator', name: 'Aide' }, token: 't', isAuthenticated: true })
    const router = renderSignOut('/admin/dashboard')

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: 'Staff sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/administrator')
    await waitFor(() => expect(useAuthStore.getState().user).toBeNull())
  })
})
