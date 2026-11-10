import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Lock, ShieldCheck, Trash2 } from 'lucide-react'
import { Badge, Button, Card, ConfirmDialog, ErrorState, LoadingSkeleton } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import { staffService } from '@/services/staffService'
import { useAuthStore } from '@/stores/authStore'
import { ACCESS_LABELS, MODULE_LABELS, isSystemAdministrator } from '@/utils/adminAccess'
import { errorMessage } from './staffDisplay'

const LEVELS = ['none', 'view', 'manage']

const MODULE_HINTS = {
  constituent_crm: 'Job seekers, employers, employer verification and reports',
  employment_hub: 'Job postings and applications',
  government_dole: 'Government programs, job fairs, DOLE and placement reports',
  system_reports: 'Labor analytics, SMS notifications, data quality',
  activity_logs: 'Everything every user has done in i-PESO',
  configuration: 'Staff list, roles, org chart and site content',
}

// The order positions appear on the org chart.
const ROLE_ORDER = ['administrator', 'law-enforcement-officer', 'administrative-aide', 'ojt-intern']
const sortRoles = (roles) => [...roles].sort((a, b) => {
  const rank = (role) => (ROLE_ORDER.includes(role.slug) ? ROLE_ORDER.indexOf(role.slug) : ROLE_ORDER.length)
  return rank(a) - rank(b) || a.name.localeCompare(b.name)
})

export default function RolePermissionsPage() {
  const user = useAuthStore((s) => s.user)
  const canEdit = isSystemAdministrator(user)

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin', 'roles'], queryFn: staffService.getRoles })
  const roles = sortRoles(data?.data ?? [])
  const modules = Object.keys(data?.available_modules ?? MODULE_LABELS)

  return (
    <div className="portal-page">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Choose what each position can open. View only lets staff look and download; Full access also lets them add, change and delete."
        eyebrow="Configuration"
      />

      {!canEdit && (
        <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          You can view roles here. Only the system administrator can change them.
        </p>
      )}

      {isLoading ? (
        <div className="mt-6"><LoadingSkeleton variant="card" rows={4} /></div>
      ) : error ? (
        <div className="mt-6"><ErrorState description="Roles could not be loaded." onRetry={refetch} error={error} /></div>
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          {roles.map((role) => (
            <RoleCard key={`${role.id}-${JSON.stringify(role.access)}`} role={role} modules={modules} canEdit={canEdit} />
          ))}
        </div>
      )}

    </div>
  )
}

function RoleCard({ role, modules, canEdit }) {
  const queryClient = useQueryClient()
  const locked = role.slug === 'administrator'
  const [levels, setLevels] = useState(role.access)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const dirty = modules.some((module) => (levels[module] ?? 'none') !== (role.access[module] ?? 'none'))

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] })
  }

  const save = useMutation({
    mutationFn: () => staffService.updateRole(role.id, levels),
    onSuccess: () => { toast.success(`Access for ${role.name} saved.`); invalidate() },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const remove = useMutation({
    mutationFn: () => staffService.deleteRole(role.id),
    onSuccess: () => { toast.success(`${role.name} deleted.`); setConfirmDelete(false); invalidate() },
    onError: (error) => { setConfirmDelete(false); toast.error(errorMessage(error)) },
  })

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-950">
            {locked ? <Lock className="h-4 w-4 text-slate-400" /> : <ShieldCheck className="h-4 w-4 text-brand-navy" />}
            {role.name}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {role.administrators_count ?? 0} {role.administrators_count === 1 ? 'account' : 'accounts'}
            {locked && ' · The PESO Office Manager. Always has full access, including staff accounts and roles'}
          </p>
        </div>
        <Badge variant={role.is_system ? 'neutral' : 'review'} icon={false}>{role.is_system ? 'Built-in' : 'Custom'}</Badge>
      </div>

      <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
        {modules.map((module) => (
          <li key={module} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">{MODULE_LABELS[module] ?? module}</p>
              <p className="text-xs text-slate-500">{MODULE_HINTS[module]}</p>
            </div>
            <LevelPicker
              label={`${role.name}: ${MODULE_LABELS[module] ?? module}`}
              value={locked ? 'manage' : (levels[module] ?? 'none')}
              disabled={!canEdit || locked || save.isPending}
              onChange={(level) => setLevels((current) => ({ ...current, [module]: level }))}
            />
          </li>
        ))}
      </ul>

      {canEdit && !locked && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>Save access</Button>
          {dirty && <Button size="sm" variant="ghost" onClick={() => setLevels(role.access)} disabled={save.isPending}>Undo changes</Button>}
          {!role.is_system && (
            <Button
              size="sm"
              variant="ghost"
              icon={Trash2}
              className="ml-auto text-red-700 hover:bg-red-50 hover:text-red-800"
              disabled={(role.administrators_count ?? 0) > 0}
              title={(role.administrators_count ?? 0) > 0 ? 'Move its staff to another role first' : undefined}
              onClick={() => setConfirmDelete(true)}
            >
              Delete role
            </Button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={(open) => !remove.isPending && setConfirmDelete(open)}
        title={`Delete ${role.name}?`}
        description="This custom role will be removed. No staff use it."
        confirmLabel="Delete role"
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </Card>
  )
}

/** Three-way segmented control: No access / View only / Full access. */
function LevelPicker({ label, value, onChange, disabled }) {
  const tone = {
    none: 'bg-slate-700 text-white',
    view: 'bg-blue-700 text-white',
    manage: 'bg-emerald-700 text-white',
  }

  return (
    <div role="radiogroup" aria-label={label} className="inline-flex shrink-0 rounded-lg border border-slate-300 bg-slate-50 p-0.5">
      {LEVELS.map((level) => {
        const selected = value === level
        return (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(level)}
            className={`rounded-md px-2.5 py-1 text-xs font-bold transition disabled:cursor-not-allowed ${
              selected ? tone[level] : 'text-slate-600 hover:bg-white disabled:hover:bg-transparent'
            } ${disabled && !selected ? 'opacity-50' : ''}`}
          >
            {ACCESS_LABELS[level]}
          </button>
        )
      })}
    </div>
  )
}
