import { createElement, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Activity, AlertTriangle, Building2, CheckCircle2, KeyRound, MessageSquareText, Plus, RefreshCw, Save, Send, ShieldCheck, Undo2, X, XCircle,
} from 'lucide-react'
import { Button, Card, ErrorState, LoadingSkeleton } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import PageHeader from '@/pages/admin/_components/PageHeader'
import { adminSystemSettingsService } from '@/services/systemSettingsService'
import { ChangesDialog } from '@/pages/admin/6-configuration/content/site-content/SiteContentBits'
import { formatWhen, inputClass, labelClass } from '@/pages/admin/6-configuration/content/site-content/formStyles'

const SECTIONS = [
  { value: 'status', label: 'System status', icon: Activity },
  { value: 'access', label: 'Access', icon: ShieldCheck },
  { value: 'sms', label: 'SMS', icon: MessageSquareText },
  { value: 'employer_rules', label: 'Employer rules', icon: Building2 },
]

const STATUS_META = {
  ok: { icon: CheckCircle2, className: 'text-emerald-600', ring: 'border-slate-200 bg-white', label: 'Working' },
  warn: { icon: AlertTriangle, className: 'text-amber-600', ring: 'border-amber-200 bg-amber-50/50', label: 'Check this' },
  error: { icon: XCircle, className: 'text-red-600', ring: 'border-red-200 bg-red-50/60', label: 'Not working' },
}

/** How a reminder-day number reads to a person. */
const describeOffset = (key, day) => {
  if (key === 'placement.reminder_offsets') {
    if (day === 0) return 'on the due day'
    return day > 0 ? `${day} day${day === 1 ? '' : 's'} before` : `${-day} day${day === -1 ? '' : 's'} after (overdue)`
  }
  return day === 0 ? 'on the expiry day' : `${day} day${day === 1 ? '' : 's'} before`
}

const describe = (setting, value) => {
  if (setting.type === 'bool') return value ? 'On' : 'Off'
  if (setting.type === 'int_list') return value.length ? value.map((d) => describeOffset(setting.key, d)).join(', ') : 'No reminders'
  if (setting.type === 'int' && setting.key === 'sms.monthly_cap' && Number(value) === 0) return 'No limit'
  return String(value)
}

/**
 * Configuration → System Settings: how i-PESO behaves — whether each service
 * really works, maintenance and registration switches, SMS cost control,
 * and employer deadlines. Only the system administrator can change it.
 */
export default function SystemSettingsPage() {
  const [params, setParams] = useSearchParams()
  const active = SECTIONS.some((s) => s.value === params.get('section')) ? params.get('section') : 'status'
  const settings = useQuery({ queryKey: ['admin-system-settings'], queryFn: adminSystemSettingsService.list })
  const status = useQuery({ queryKey: ['admin-system-status'], queryFn: adminSystemSettingsService.status, staleTime: 30 * 1000 })

  const problems = status.data?.checks.filter((check) => check.status !== 'ok').length ?? 0

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Configuration"
        title="System Settings"
        subtitle="How i-PESO behaves: whether each service is working, maintenance and registration switches, SMS limits and employer deadlines. API keys stay in the server's .env file and never appear here."
      />

      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="lg:sticky lg:top-6 lg:self-start">
          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:pb-0">
            {SECTIONS.map((section) => {
              const selected = section.value === active
              return (
                <button
                  key={section.value}
                  type="button"
                  aria-current={selected ? 'page' : undefined}
                  onClick={() => setParams(section.value === 'status' ? {} : { section: section.value })}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-bold transition ${
                    selected ? 'bg-brand-navy text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:border-brand-navy hover:text-brand-navy lg:border-transparent lg:bg-transparent'
                  }`}
                >
                  {createElement(section.icon, { className: 'h-4 w-4 shrink-0', 'aria-hidden': true })}
                  <span className="flex-1 whitespace-nowrap">{section.label}</span>
                  {section.value === 'status' && problems > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${selected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`} aria-label={`${problems} to check`}>{problems}</span>
                  )}
                </button>
              )
            })}
          </div>
        </nav>

        <section aria-label={SECTIONS.find((s) => s.value === active)?.label} className="min-w-0 space-y-4">
          {settings.isLoading ? (
            <LoadingSkeleton variant="card" rows={4} />
          ) : settings.isError ? (
            <ErrorState onRetry={() => settings.refetch()} />
          ) : (
            <>
              {!settings.data.can_edit && (
                <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  You can view these settings. Only the system administrator (PESO Office Manager) can change them or send test messages.
                </div>
              )}
              {active === 'status' ? (
                <StatusPanel status={status} canEdit={settings.data.can_edit} />
              ) : (
                <SettingsGroup
                  key={`${active}-${JSON.stringify(settings.data.settings.filter((s) => s.group === active).map((s) => s.value))}`}
                  group={active}
                  title={settings.data.groups[active]}
                  settings={settings.data.settings.filter((s) => s.group === active)}
                  canEdit={settings.data.can_edit}
                  smsUsage={status.data?.checks.find((c) => c.id === 'sms')?.details}
                />
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

// ── System status ──────────────────────────────────────────────────────

function StatusPanel({ status, canEdit }) {
  const [smsOpen, setSmsOpen] = useState(false)
  const run = (fn) => ({
    mutationFn: fn,
    onSuccess: (data) => toast.success(data.message, { duration: 7000 }),
    onError: (error) => toast.error(error?.response?.data?.errors?.phone?.[0] ?? error?.response?.data?.message ?? 'The test could not run.', { duration: 7000 }),
  })
  const testEmail = useMutation(run(adminSystemSettingsService.testEmail))
  const testAi = useMutation(run(adminSystemSettingsService.testAi))

  if (status.isLoading) return <LoadingSkeleton variant="card" rows={5} />
  if (status.isError) return <ErrorState onRetry={() => status.refetch()} />

  const { checks, overall, checked_at: checkedAt } = status.data
  const overallText = {
    ok: 'Everything is working.',
    warn: 'Working, with some things to check.',
    error: 'Something important is not working.',
  }[overall]

  const testButton = (check) => {
    if (!canEdit || !check.test) return null
    if (check.test === 'email') return <Button size="sm" variant="outline" icon={Send} loading={testEmail.isPending} onClick={() => testEmail.mutate()}>Send me a test email</Button>
    if (check.test === 'ai') return <Button size="sm" variant="outline" icon={Send} loading={testAi.isPending} onClick={() => testAi.mutate()}>Test the AI</Button>
    if (check.test === 'sms') return <Button size="sm" variant="outline" icon={Send} onClick={() => setSmsOpen(true)}>Send a test SMS</Button>
    return null
  }

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {createElement(STATUS_META[overall].icon, { className: `h-8 w-8 ${STATUS_META[overall].className}`, 'aria-hidden': true })}
            <div>
              <p className="text-lg font-black text-slate-950">{overallText}</p>
              <p className="text-xs text-slate-500">Checked {formatWhen(checkedAt)}</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" icon={RefreshCw} loading={status.isFetching} onClick={() => status.refetch()}>Check again</Button>
        </div>
      </Card>

      <ul className="space-y-3" aria-label="Service checks">
        {checks.map((check) => {
          const meta = STATUS_META[check.status]
          const details = Object.entries(check.details ?? {}).filter(([, value]) => value !== null && value !== '')
          return (
            <li key={check.id} className={`rounded-2xl border p-4 ${meta.ring}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                {createElement(meta.icon, { className: `mt-0.5 h-5 w-5 shrink-0 ${meta.className}`, 'aria-label': meta.label })}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-950">{check.label}</p>
                  <p className="mt-0.5 text-sm text-slate-700">{check.summary}</p>
                  {check.fix && <p className="mt-1 text-xs text-slate-600"><strong>How to fix:</strong> {check.fix}</p>}
                  {details.length > 0 && (
                    <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                      {details.map(([key, value]) => (
                        <div key={key} className="flex gap-1">
                          <dt>{key}:</dt>
                          <dd className="font-semibold text-slate-700">{/^\d{4}-\d{2}-\d{2}T/.test(String(value)) ? formatWhen(value) : String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
                <div className="shrink-0">{testButton(check)}</div>
              </div>
            </li>
          )
        })}
      </ul>

      <TestSmsDialog open={smsOpen} onOpenChange={setSmsOpen} />
    </>
  )
}

function TestSmsDialog({ open, onOpenChange }) {
  const [phone, setPhone] = useState('')
  const send = useMutation({
    mutationFn: () => adminSystemSettingsService.testSms(phone.trim()),
    onSuccess: (data) => { toast.success(data.message, { duration: 7000 }); onOpenChange(false) },
    onError: (error) => toast.error(error?.response?.data?.errors?.phone?.[0] ?? error?.response?.data?.message ?? 'The test SMS could not be sent.', { duration: 7000 }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send a test SMS</DialogTitle>
          <DialogDescription>A short test message goes to this number. When SMS is live it uses one UniSMS credit.</DialogDescription>
        </DialogHeader>
        <label className="block">
          <span className={labelClass}>Mobile number</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="09171234567" aria-label="Mobile number" className={inputClass} />
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={send.isPending}>Cancel</Button>
          <Button variant="navy" icon={Send} loading={send.isPending} disabled={phone.trim().length < 11} onClick={() => send.mutate()}>Send test</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Editable groups ────────────────────────────────────────────────────

function SettingsGroup({ group, title, settings, canEdit, smsUsage }) {
  const queryClient = useQueryClient()
  const initial = Object.fromEntries(settings.map((s) => [s.key, s.value]))
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [confirmOpen, setConfirmOpen] = useState(false)

  const changed = settings.filter((s) => JSON.stringify(form[s.key]) !== JSON.stringify(initial[s.key]))
  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    if (errors[`values.${key}`]) setErrors((current) => ({ ...current, [`values.${key}`]: undefined }))
  }

  const save = useMutation({
    mutationFn: () => adminSystemSettingsService.save(Object.fromEntries(changed.map((s) => [s.key, form[s.key]]))),
    onSuccess: (data) => {
      setConfirmOpen(false)
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['admin-system-settings'] })
      queryClient.invalidateQueries({ queryKey: ['admin-system-status'] })
      queryClient.invalidateQueries({ queryKey: ['system-status'] })
    },
    onError: (error) => {
      setConfirmOpen(false)
      if (error?.response?.data?.errors) setErrors(Object.fromEntries(Object.entries(error.response.data.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])))
      toast.error(error?.response?.data?.message ?? 'Could not save the settings.')
    },
  })

  const maintenanceTurningOn = group === 'access' && form['maintenance.enabled'] && !initial['maintenance.enabled']
  const smsTypeKeys = settings.filter((s) => s.key.startsWith('sms.types.'))

  const renderSetting = (setting) => (
    <SettingField
      key={setting.key}
      setting={setting}
      value={form[setting.key]}
      onChange={(value) => set(setting.key, value)}
      error={errors[`values.${setting.key}`]}
      disabled={!canEdit || (setting.key.startsWith('sms.types.') && !form['sms.enabled'])}
      extra={setting.key === 'sms.monthly_cap' && smsUsage ? `Sent so far this month: ${smsUsage['Sent this month'] ?? 0}.` : null}
    />
  )

  return (
    <Card>
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-4 divide-y divide-slate-100">
        {group === 'sms' ? (
          <>
            {settings.filter((s) => s.key === 'sms.enabled').map(renderSetting)}
            <div className="py-4">
              <p className={labelClass}>Which messages may be sent</p>
              <div className="mt-1 divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">{smsTypeKeys.map(renderSetting)}</div>
            </div>
            {settings.filter((s) => s.key === 'sms.monthly_cap').map(renderSetting)}
          </>
        ) : (
          settings.map(renderSetting)
        )}
      </div>

      {canEdit && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
          {changed.length > 0 && <Button variant="ghost" size="sm" icon={Undo2} onClick={() => { setForm(initial); setErrors({}) }}>Discard changes</Button>}
          <Button variant="navy" icon={Save} disabled={changed.length === 0} onClick={() => setConfirmOpen(true)}>Save{changed.length ? ` (${changed.length})` : ''}</Button>
        </div>
      )}

      <ChangesDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={maintenanceTurningOn ? 'Turn on maintenance mode?' : `Save ${title.toLowerCase()} settings?`}
        changes={changed.map((s) => ({ key: s.key, label: s.label, before: describe(s, initial[s.key]), after: describe(s, form[s.key]) }))}
        busy={save.isPending}
        confirmLabel={maintenanceTurningOn ? 'Turn on maintenance' : 'Save settings'}
        onConfirm={() => save.mutate()}
      />
    </Card>
  )
}

function SettingField({ setting, value, onChange, error, disabled, extra }) {
  const meta = setting.updated_at ? `Changed ${formatWhen(setting.updated_at)}${setting.updated_by ? ` by ${setting.updated_by}` : ''}` : null
  const id = `setting-${setting.key.replace(/\W/g, '-')}`

  if (setting.type === 'bool') {
    return (
      <div className="flex items-start justify-between gap-4 py-4">
        <div className="min-w-0">
          <p id={`${id}-label`} className="text-sm font-bold text-slate-950">{setting.label}</p>
          <p className="mt-0.5 text-xs text-slate-600">{setting.help}</p>
          {meta && <p className="mt-1 text-[11px] text-slate-400">{meta}</p>}
          {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(value)}
          aria-labelledby={`${id}-label`}
          disabled={disabled}
          onClick={() => onChange(!value)}
          className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${value ? 'bg-brand-navy' : 'bg-slate-300'}`}
        >
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
    )
  }

  return (
    <div className="py-4">
      <label htmlFor={id} className="text-sm font-bold text-slate-950">{setting.label}</label>
      <p className="mt-0.5 text-xs text-slate-600">{setting.help}</p>
      {setting.type === 'text' && (
        <>
          <textarea id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value.slice(0, setting.max))} disabled={disabled} rows={2} className={inputClass} />
          <p className="mt-1 text-right text-xs tabular-nums text-slate-400">{(value ?? '').length}/{setting.max}</p>
        </>
      )}
      {setting.type === 'int' && (
        <input id={id} type="number" inputMode="numeric" min={setting.min} max={setting.max} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} disabled={disabled} className={`${inputClass} max-w-[10rem]`} />
      )}
      {setting.type === 'int_list' && <DayListEditor id={id} setting={setting} value={value ?? []} onChange={onChange} disabled={disabled} />}
      {extra && <p className="mt-1 text-xs font-semibold text-slate-600">{extra}</p>}
      {meta && <p className="mt-1 text-[11px] text-slate-400">{meta}</p>}
      {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  )
}

/** Reminder days as removable chips, each read out in words ("3 days before"). */
function DayListEditor({ id, setting, value, onChange, disabled }) {
  const [draft, setDraft] = useState('')
  const number = Number(draft)
  const valid = draft !== '' && Number.isInteger(number) && number >= setting.min && number <= setting.max && !value.includes(number)
  const full = value.length >= setting.max_items

  const add = () => {
    if (!valid || full) return
    onChange([...value, number].sort((a, b) => b - a))
    setDraft('')
  }

  return (
    <div className="mt-2">
      <ul className="flex flex-wrap gap-2" aria-label={`${setting.label} days`}>
        {value.length === 0 && <li className="text-xs text-slate-500">No reminders.</li>}
        {value.map((day) => (
          <li key={day} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-1.5 text-xs font-bold text-slate-800">
            {describeOffset(setting.key, day)}
            {!disabled && (
              <button type="button" onClick={() => onChange(value.filter((d) => d !== day))} aria-label={`Remove ${describeOffset(setting.key, day)}`} className="rounded-full p-0.5 text-slate-400 hover:bg-white hover:text-red-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {!disabled && !full && (
        <div className="mt-2 flex items-center gap-2">
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={setting.min}
            max={setting.max}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
            placeholder="Days"
            aria-label={`Add a day to ${setting.label}`}
            className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
          />
          <Button size="sm" variant="outline" icon={Plus} disabled={!valid} onClick={add}>Add</Button>
          {draft !== '' && valid && <span className="text-xs text-slate-500">= {describeOffset(setting.key, number)}</span>}
        </div>
      )}
      <p className="mt-1 text-[11px] text-slate-400">Up to {setting.max_items} reminders, from {setting.min} to {setting.max}.</p>
    </div>
  )
}
