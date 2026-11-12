import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AnnouncementBanner from '../AnnouncementBanner'
import AnnouncementsFeedPage from '@/pages/shared/AnnouncementsFeedPage'
import { renderWithProviders } from '@/test/utils'
import { announcementService } from '@/services/announcementService'

vi.mock('@/services/announcementService', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    announcementService: {
      list: vi.fn(),
      banner: vi.fn(),
      unreadCount: vi.fn(),
      get: vi.fn(),
      dismiss: vi.fn(),
      readAll: vi.fn(),
      attachment: vi.fn(),
    },
  }
})
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const item = (overrides = {}) => ({
  id: 1,
  title: 'PESO office closed Friday',
  body: 'The office is closed for the city holiday.\nRegular hours resume Monday.',
  excerpt: 'The office is closed for the city holiday.',
  category: 'advisory',
  category_label: 'Office advisory',
  priority: 'urgent',
  is_pinned: false,
  publish_at: '2026-11-12T00:00:00Z',
  expires_at: null,
  link_label: 'View job fairs',
  link_url: '/seeker/job-fairs',
  has_attachment: false,
  is_read: false,
  is_dismissed: false,
  ...overrides,
})

describe('Dashboard announcement banner', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows urgent announcements and hides one once dismissed', async () => {
    announcementService.banner.mockResolvedValue({ data: [item()], unread_count: 1 })
    announcementService.dismiss.mockResolvedValue({})

    renderWithProviders(<AnnouncementBanner />)

    expect(await screen.findByText('Urgent PESO announcement')).toBeInTheDocument()
    expect(screen.getByText('PESO office closed Friday')).toBeInTheDocument()

    announcementService.banner.mockResolvedValue({ data: [], unread_count: 1 })
    await userEvent.click(screen.getByRole('button', { name: /dismiss announcement/i }))

    expect(announcementService.dismiss).toHaveBeenCalledWith(1)
    await waitFor(() => expect(screen.queryByText('PESO office closed Friday')).not.toBeInTheDocument())
  })

  it('renders nothing when there is nothing to announce', async () => {
    announcementService.banner.mockResolvedValue({ data: [], unread_count: 0 })
    const { container } = renderWithProviders(<AnnouncementBanner />)

    await waitFor(() => expect(announcementService.banner).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })
})

describe('Announcements page', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists announcements and opening one shows the full message and link', async () => {
    announcementService.list.mockResolvedValue({ data: [item({ priority: 'normal' })], unread_count: 1, last_page: 1 })
    announcementService.get.mockResolvedValue({ announcement: item({ priority: 'normal', is_read: true }), unread_count: 0 })

    renderWithProviders(<AnnouncementsFeedPage role="seeker" />)

    expect(await screen.findByText('PESO office closed Friday')).toBeInTheDocument()
    expect(screen.getByLabelText('Unread')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mark all as read \(1\)/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /PESO office closed Friday/i }))

    expect(announcementService.get).toHaveBeenCalledWith('1')
    expect(await screen.findByRole('dialog')).toHaveTextContent('Regular hours resume Monday.')
    expect(screen.getByRole('link', { name: 'View job fairs' })).toHaveAttribute('href', '/seeker/job-fairs')
  })

  it('opens the announcement named in ?open= (the bell notification link)', async () => {
    announcementService.list.mockResolvedValue({ data: [item()], unread_count: 1, last_page: 1 })
    announcementService.get.mockResolvedValue({ announcement: item({ is_read: true }), unread_count: 0 })

    renderWithProviders(<AnnouncementsFeedPage role="employer" />, { route: '/employer/announcements?open=1' })

    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('Regular hours resume Monday.'))
    expect(announcementService.get).toHaveBeenCalledWith('1')
  })
})
