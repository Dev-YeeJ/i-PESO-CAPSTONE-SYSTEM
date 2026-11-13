import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AnnouncementFormPage from '../AnnouncementFormPage'
import AnnouncementsPage from '../AnnouncementsPage'
import { renderWithProviders } from '@/test/utils'
import { adminAnnouncementService } from '@/services/announcementService'
import { useAuthStore } from '@/stores/authStore'

vi.mock('@/services/announcementService', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    adminAnnouncementService: {
      options: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      action: vi.fn(),
      remove: vi.fn(),
      attachment: vi.fn(),
    },
  }
})
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const options = {
  audiences: [
    { value: 'public', label: 'Public', count: 1240 },
    { value: 'all', label: 'All', count: 1240 },
    { value: 'seekers', label: 'Job seekers', count: 1000 },
    { value: 'employers', label: 'Employers', count: 240 },
  ],
}

describe('Admin announcement form', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: { admin_id: 1, first_name: 'Office', is_system_administrator: true } })
    adminAnnouncementService.options.mockResolvedValue(options)
  })

  it('refuses to publish without a title and message', async () => {
    renderWithProviders(<AnnouncementFormPage />)

    await userEvent.click(await screen.findByRole('button', { name: /publish now/i }))

    expect(screen.getByText('Add a title.')).toBeInTheDocument()
    expect(screen.getByText('Write the announcement message.')).toBeInTheDocument()
    expect(adminAnnouncementService.create).not.toHaveBeenCalled()
  })

  it('confirms the audience size and notification before publishing', async () => {
    adminAnnouncementService.create.mockResolvedValue({ message: 'Announcement published.', announcement: { id: 7 } })
    renderWithProviders(<AnnouncementFormPage />)

    await userEvent.type(screen.getByPlaceholderText(/PESO office closed/i), 'Office closed Friday')
    await userEvent.type(screen.getByPlaceholderText(/Write the full announcement/i), 'Holiday closure.')
    await userEvent.click(screen.getByRole('radio', { name: /job seekers/i }))
    expect(await screen.findByText(/Job seekers only .* · 1,000 accounts/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: /also notify the audience/i }))
    await userEvent.click(screen.getByRole('button', { name: /publish now/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Job seekers \(1,000 accounts\)/)).toBeInTheDocument()
    expect(within(dialog).getByText(/cannot be recalled/)).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: /publish now/i }))

    await waitFor(() => expect(adminAnnouncementService.create).toHaveBeenCalledTimes(1))
    const [values, intent] = adminAnnouncementService.create.mock.calls[0]
    expect(intent).toBe('publish')
    expect(values).toMatchObject({ title: 'Office closed Friday', body: 'Holiday closure.', audience: 'seekers', notify_users: true, publish_at: '' })
  })

  it('publishes straight away when no notification is sent', async () => {
    adminAnnouncementService.create.mockResolvedValue({ message: 'Announcement published.', announcement: { id: 8 } })
    renderWithProviders(<AnnouncementFormPage />)

    await userEvent.type(screen.getByPlaceholderText(/PESO office closed/i), 'Office closed Friday')
    await userEvent.type(screen.getByPlaceholderText(/Write the full announcement/i), 'Holiday closure.')
    await userEvent.click(screen.getByRole('button', { name: /publish now/i }))

    await waitFor(() => expect(adminAnnouncementService.create).toHaveBeenCalledWith(expect.objectContaining({ notify_users: false }), 'publish'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps optional settings folded away until asked for', async () => {
    renderWithProviders(<AnnouncementFormPage />)

    await screen.findByPlaceholderText(/PESO office closed/i)
    expect(screen.queryByLabelText(/category/i)).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/seeker\/job-fairs/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /more options/i }))

    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/seeker\/job-fairs/i)).toBeInTheDocument()
  })

  it('opens read-only for view-only staff', async () => {
    useAuthStore.setState({ user: { admin_id: 2, access: { configuration: 'view' } } })
    renderWithProviders(<AnnouncementFormPage />)

    expect(await screen.findByText(/can view announcements but not change them/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /publish now/i })).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText(/PESO office closed/i)).toBeDisabled()
  })
})

describe('Admin announcement list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: { admin_id: 1, is_system_administrator: true } })
  })

  it('shows state, audience and reach for each announcement', async () => {
    adminAnnouncementService.list.mockResolvedValue({
      data: [{
        id: 1, title: 'Job fair on Monday', excerpt: 'Bring your resume', category: 'job_fair', category_label: 'Job fairs & events',
        priority: 'important', is_pinned: true, audience: 'seekers', state: 'live', state_label: 'Live',
        publish_at: '2026-11-10T00:00:00Z', expires_at: null, first_published_at: '2026-11-10T00:00:00Z', seen: 25, targeted: 100,
      }],
      total: 1, last_page: 1, from: 1, to: 1,
      summary: { total: 1, live: 1, scheduled: 0, draft: 0, expired: 0, archived: 0 },
    })

    renderWithProviders(<AnnouncementsPage />)

    expect(await screen.findByText('Job fair on Monday')).toBeInTheDocument()
    expect(screen.getByText('Seen by 25 of 100')).toBeInTheDocument()
    expect(screen.getAllByText('Job seekers').length).toBeGreaterThan(0)
    expect(screen.getByRole('progressbar', { name: /share of the audience/i })).toHaveAttribute('aria-valuenow', '25')
    expect(screen.getByRole('button', { name: /new announcement/i })).toBeInTheDocument()
  })
})
