import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AnnouncementBanner from '../AnnouncementBanner'
import { Route, Routes, useLocation } from 'react-router-dom'
import DashboardAnnouncements from '../DashboardAnnouncements'
import AnnouncementsRedirect from '../AnnouncementsRedirect'
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
vi.mock('@/lib/toast', () => { const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), warning: vi.fn(), loading: vi.fn(), dismiss: vi.fn() }); return { default: toast, toast } })

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

describe('Dashboard announcements (no separate Announcements page)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    announcementService.banner.mockResolvedValue({ data: [], unread_count: 0 })
  })

  const page = (items, { current = 1, last = 1, unread = 1 } = {}) => ({ data: items, unread_count: unread, current_page: current, last_page: last })

  it('lists every announcement with unread marks and opens the full message', async () => {
    announcementService.list.mockResolvedValue(page([item({ priority: 'normal' })]))
    announcementService.get.mockResolvedValue({ announcement: item({ priority: 'normal', is_read: true }), unread_count: 0 })

    renderWithProviders(<DashboardAnnouncements />, { route: '/seeker/dashboard' })

    expect(await screen.findByRole('heading', { name: /PESO announcements/ })).toHaveTextContent('1 new')
    expect(screen.getByText('PESO office closed Friday')).toBeInTheDocument()
    expect(screen.getByLabelText('Unread')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mark all as read/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /PESO office closed Friday/i }))

    expect(announcementService.get).toHaveBeenCalledWith('1')
    expect(await screen.findByRole('dialog')).toHaveTextContent('Regular hours resume Monday.')
    expect(screen.getByRole('link', { name: 'View job fairs' })).toHaveAttribute('href', '/seeker/job-fairs')
  })

  it('opens the announcement a bell notification points to (?announcement=)', async () => {
    announcementService.list.mockResolvedValue(page([item()]))
    announcementService.get.mockResolvedValue({ announcement: item({ is_read: true }), unread_count: 0 })

    renderWithProviders(<DashboardAnnouncements />, { route: '/employer/dashboard?announcement=1' })

    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('Regular hours resume Monday.'))
    expect(announcementService.get).toHaveBeenCalledWith('1')
  })

  it('shows three at first and loads older ones on request', async () => {
    const many = Array.from({ length: 10 }, (_, index) => item({ id: index + 1, title: `Notice ${index + 1}`, priority: 'normal' }))
    announcementService.list
      .mockResolvedValueOnce(page(many, { current: 1, last: 2 }))
      .mockResolvedValueOnce(page([item({ id: 11, title: 'Notice 11', priority: 'normal' })], { current: 2, last: 2 }))

    renderWithProviders(<DashboardAnnouncements />, { route: '/seeker/dashboard' })

    expect(await screen.findByText('Notice 3')).toBeInTheDocument()
    expect(screen.queryByText('Notice 4')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /show older announcements/i }))
    expect(screen.getByText('Notice 8')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /show older announcements/i }))
    expect(await screen.findByText('Notice 11')).toBeInTheDocument()
    expect(announcementService.list).toHaveBeenLastCalledWith({ page: 2, per_page: 10 })
    expect(screen.queryByRole('button', { name: /show older announcements/i })).not.toBeInTheDocument()
  })

  it('stays out of the way when nothing has been announced', async () => {
    announcementService.list.mockResolvedValue(page([], { unread: 0 }))

    renderWithProviders(<DashboardAnnouncements />, { route: '/seeker/dashboard' })

    await waitFor(() => expect(announcementService.list).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { name: /PESO announcements/ })).not.toBeInTheDocument()
  })

  it('sends an old /announcements?open= link to the dashboard with that announcement', async () => {
    function Where() {
      const location = useLocation()
      return <p>at {location.pathname}{location.search}</p>
    }

    renderWithProviders(
      <Routes>
        <Route path="/employer/announcements" element={<AnnouncementsRedirect to="/employer/dashboard" />} />
        <Route path="/employer/dashboard" element={<Where />} />
      </Routes>,
      { route: '/employer/announcements?open=7' },
    )

    expect(await screen.findByText('at /employer/dashboard?announcement=7')).toBeInTheDocument()
  })
})
