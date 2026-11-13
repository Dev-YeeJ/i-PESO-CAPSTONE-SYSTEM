import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import SystemSettingsPage from '../SystemSettingsPage'
import { renderWithProviders } from '@/test/utils'
import { adminSystemSettingsService, publicSystemStatusService } from '@/services/systemSettingsService'
import { MaintenanceScreen, RegistrationGate } from '@/components/system/SystemNotices'

vi.mock('@/services/systemSettingsService', () => ({
  adminSystemSettingsService: { list: vi.fn(), save: vi.fn(), status: vi.fn(), testEmail: vi.fn(), testSms: vi.fn(), testAi: vi.fn() },
  publicSystemStatusService: { get: vi.fn() },
}))
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

const setting = (key, group, type, value, extra = {}) => ({ key, group, type, value, default: value, label: extra.label ?? key, help: `${key} help`, changed: false, updated_at: null, updated_by: null, ...extra })

const list = (canEdit = true) => ({
  groups: { access: 'Access', sms: 'SMS', employer_rules: 'Employer rules' },
  can_edit: canEdit,
  settings: [
    setting('maintenance.enabled', 'access', 'bool', false, { label: 'Maintenance mode' }),
    setting('maintenance.message', 'access', 'text', 'i-PESO is being updated right now.', { label: 'Maintenance message', max: 300 }),
    setting('sms.enabled', 'sms', 'bool', true, { label: 'Send SMS' }),
    setting('sms.types.interview', 'sms', 'bool', true, { label: 'Interview messages' }),
    setting('sms.monthly_cap', 'sms', 'int', 0, { label: 'Monthly SMS limit', min: 0, max: 100000 }),
    setting('placement.deadline_day', 'employer_rules', 'int', 10, { label: 'Placement report due day', min: 1, max: 28 }),
    setting('placement.reminder_offsets', 'employer_rules', 'int_list', [3, 0, -7], { label: 'Placement report reminders', min: -30, max: 28, max_items: 5 }),
  ],
})

const status = {
  checked_at: '2026-11-13T02:00:00Z',
  overall: 'error',
  checks: [
    { id: 'scheduler', label: 'Scheduler (cron)', status: 'error', summary: 'No sign of the scheduler running.', details: {}, test: null, fix: 'Add a cron job that runs php artisan schedule:run every minute.' },
    { id: 'sms', label: 'SMS (UniSMS)', status: 'warn', summary: 'Test mode — messages are written to the log, not sent to phones.', details: { Mode: 'Test (log only)', 'Sent this month': 4 }, test: 'sms', fix: null },
    { id: 'email', label: 'Email', status: 'ok', summary: 'Sending through SMTP.', details: {}, test: 'email', fix: null },
  ],
}

describe('System Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    adminSystemSettingsService.list.mockResolvedValue(list())
    adminSystemSettingsService.status.mockResolvedValue(status)
  })

  it('opens on the system status with what is broken and how to fix it', async () => {
    adminSystemSettingsService.testEmail.mockResolvedValue({ message: 'Test email sent.' })
    renderWithProviders(<SystemSettingsPage />, { route: '/admin/settings' })

    expect(await screen.findByText('Something important is not working.')).toBeInTheDocument()
    expect(screen.getByText(/Add a cron job/)).toBeInTheDocument()
    expect(screen.getByText(/Test mode/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /send me a test email/i }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Test email sent.', expect.anything()))
  })

  it('asks only before turning maintenance mode on', async () => {
    adminSystemSettingsService.save.mockResolvedValue({ message: 'Settings saved.', changed: ['maintenance.enabled'] })
    renderWithProviders(<SystemSettingsPage />, { route: '/admin/settings?section=access' })

    await userEvent.click(await screen.findByRole('switch', { name: 'Maintenance mode' }))
    expect(adminSystemSettingsService.save).not.toHaveBeenCalled()

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Turn on maintenance mode?')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: /turn on maintenance/i }))

    await waitFor(() => expect(adminSystemSettingsService.save).toHaveBeenCalledWith({ 'maintenance.enabled': true }))
  })

  it('saves any other switch the moment it is flipped', async () => {
    adminSystemSettingsService.save.mockResolvedValue({ message: 'Settings saved.', changed: ['sms.types.interview'] })
    renderWithProviders(<SystemSettingsPage />, { route: '/admin/settings?section=sms' })

    await userEvent.click(await screen.findByRole('switch', { name: 'Interview messages' }))

    await waitFor(() => expect(adminSystemSettingsService.save).toHaveBeenCalledWith({ 'sms.types.interview': false }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('reads reminder days out in words and keeps them in order', async () => {
    adminSystemSettingsService.save.mockResolvedValue({ message: 'Settings saved.', changed: [] })
    renderWithProviders(<SystemSettingsPage />, { route: '/admin/settings?section=employer_rules' })

    expect(await screen.findByText('7 days after (overdue)')).toBeInTheDocument()
    expect(screen.getByText('on the due day')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('spinbutton', { name: /add a day to placement report reminders/i }), '5')
    expect(screen.getByText('= 5 days before')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    await userEvent.click(screen.getByRole('button', { name: /remove on the due day/i }))
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(adminSystemSettingsService.save).toHaveBeenCalledWith({ 'placement.reminder_offsets': [5, 3, -7] }))
  })

  it('greys out the SMS types while SMS is switched off and shows this month’s usage', async () => {
    adminSystemSettingsService.save.mockResolvedValue({ message: 'Settings saved.', changed: ['sms.enabled'] })
    renderWithProviders(<SystemSettingsPage />, { route: '/admin/settings?section=sms' })

    const interview = await screen.findByRole('switch', { name: 'Interview messages' })
    expect(interview).not.toBeDisabled()
    expect(screen.getByText('Sent so far this month: 4.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('switch', { name: 'Send SMS' }))
    expect(interview).toBeDisabled()
  })

  it('is read-only for staff who are not the system administrator', async () => {
    adminSystemSettingsService.list.mockResolvedValue(list(false))
    renderWithProviders(<SystemSettingsPage />, { route: '/admin/settings?section=access' })

    expect(await screen.findByText(/only the system administrator/i)).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Maintenance mode' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /^save/i })).not.toBeInTheDocument()
  })
})

describe('Public notices', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the office’s maintenance message', () => {
    renderWithProviders(<MaintenanceScreen message="Back at 5 PM." />)
    expect(screen.getByRole('heading', { name: /under maintenance/i })).toBeInTheDocument()
    expect(screen.getByText('Back at 5 PM.')).toBeInTheDocument()
  })

  it('pauses job seeker registration but points to the employer form that is still open', async () => {
    publicSystemStatusService.get.mockResolvedValue({
      maintenance: { enabled: false, message: null },
      registration: { seekers_open: false, employers_open: true, closed_message: 'Back next week.' },
      chatbot_enabled: true,
    })

    renderWithProviders(<RegistrationGate role="seeker"><p>Registration form</p></RegistrationGate>)

    expect(await screen.findByText('Back next week.')).toBeInTheDocument()
    expect(screen.queryByText('Registration form')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /employer registration is open/i })).toHaveAttribute('href', '/register/employer')
  })

  it('shows the form while registration is open (or the status cannot be loaded)', async () => {
    publicSystemStatusService.get.mockRejectedValue(new Error('offline'))
    renderWithProviders(<RegistrationGate role="employer"><p>Registration form</p></RegistrationGate>)
    expect(screen.getByText('Registration form')).toBeInTheDocument()
  })
})
