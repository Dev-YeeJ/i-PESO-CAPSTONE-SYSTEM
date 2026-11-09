import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { KeyRound, Pencil, UserCheck, UserX } from 'lucide-react'
import { Badge, Button, ConfirmDialog } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { staffService } from '@/services/staffService'
import { adminService } from '@/services/adminService'
import { ACCESS_LABELS, MODULE_LABELS } from '@/utils/adminAccess'
import { accountStatus, errorMessage, formatDate, formatDateTime, initialsOf } from '../staffDisplay'

/** One staff member's profile, with the system administrator's account actions. */
export default function StaffDetailDialog({ staff, employmentTypes, canManageAccounts, canViewActivity, isSelf, onOpenChange, onEdit, onChanged }) {
  const [confirm, setConfirm] = useState(null)
  const open = !!staff

  const run = useMutation({
    mutationFn: ({ action }) => {
      if (action === 'deactivate') return staffService.deactivateStaff(staff.id)
      if (action === 'reactivate') return staffService.reactivateStaff(staff.id)
      return staffService.sendPassword(staff.id)
    },
    onSuccess: (data) => {
      setConfirm(null)
      if (data.email_sent !== false) toast.success(data.message)
      onChanged(data)
    },
    onError: (error) => {
      setConfirm(null)
      toast.error(errorMessage(error))
    },
  })

  if (!staff) return null

  const status = accountStatus(staff)
  const setupPending = staff.account_status === 'invited' || staff.account_status === 'invite_expired'
  const access = Object.entries(staff.access ?? {})

  const confirmations = {
    password: {
      title: setupPending ? 'Resend the invite?' : 'Send a new temporary password?',
      description: setupPending
        ? `${staff.email} will get a new email with a fresh temporary password (valid for 3 days). The old one stops working.`
        : `${staff.name} will be signed out on every device and must sign in with the new temporary password sent to ${staff.email}.`,
      confirmLabel: setupPending ? 'Resend invite' : 'Send new password',
      variant: 'primary',
    },
    deactivate: {
      title: `Deactivate ${staff.name}?`,
      description: 'They will be signed out right away and can no longer sign in. Everything they created stays, and you can reactivate the account later.',
      confirmLabel: 'Deactivate account',
      variant: 'danger',
    },
    reactivate: {
      title: `Reactivate ${staff.name}?`,
      description: staff.account_status === 'internship_ended'
        ? 'If the internship was extended, edit the end date first. They will be able to sign in again with their existing password.'
        : 'They will be able to sign in again with their existing password.',
      confirmLabel: 'Reactivate account',
      variant: 'primary',
    },
  }
  const pending = confirm ? confirmations[confirm] : null

  return (
    <>
      <Dialog open={open && !confirm} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-navy text-lg font-black text-white">
                {initialsOf(staff.name)}
              </span>
              <div className="min-w-0">
                <DialogTitle className="truncate">{staff.name}</DialogTitle>
                <DialogDescription className="truncate">{staff.position_label ?? 'No position set'}</DialogDescription>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge status={status.variant}>{status.label}</Badge>
                  {staff.role && <Badge variant="review" icon={false}>{staff.role.name}</Badge>}
                  {isSelf && <Badge variant="neutral" icon={false}>You</Badge>}
                </div>
              </div>
            </div>
          </DialogHeader>

          <dl className="grid gap-x-6 gap-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <Detail label="Email" value={staff.email} />
            <Detail label="Mobile number" value={staff.mobile_number} />
            <Detail label="Employment type" value={employmentTypes?.[staff.employment_type]} />
            <Detail label="Employee no." value={staff.employee_no} />
            <Detail label="Date started" value={formatDate(staff.date_started)} />
            <Detail label="Last sign-in" value={formatDateTime(staff.last_login_at) ?? 'Never signed in'} />
            {setupPending && (
              <Detail
                label="Temporary password expires"
                value={staff.account_status === 'invite_expired' ? 'Expired — resend the invite' : formatDateTime(staff.temporary_password_expires_at)}
              />
            )}
            <Detail label="Account created" value={formatDate(staff.created_at)} />
          </dl>

          {staff.internship && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
              <h3 className="text-sm font-bold text-blue-900">Internship</h3>
              <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <Detail label="School" value={staff.internship.school} />
                <Detail label="Course" value={staff.internship.course} />
                <Detail label="Required hours" value={staff.internship.required_hours ? `${staff.internship.required_hours} hours` : null} />
                <Detail label="Dates" value={staff.internship.start_date ? `${formatDate(staff.internship.start_date)} – ${formatDate(staff.internship.end_date)}` : null} />
              </dl>
              <p className="mt-3 text-xs text-blue-800">Hours and the daily time record are in Configuration → OJT / Interns.</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-bold text-slate-900">What they can open</h3>
            {staff.is_system_administrator ? (
              <p className="mt-1 text-sm text-slate-600">Everything, including staff accounts and roles (System Administrator).</p>
            ) : access.length ? (
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {access.map(([module, level]) => (
                  <li key={module} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <span className="font-medium text-slate-700">{MODULE_LABELS[module] ?? module}</span>
                    <span className={`text-xs font-bold ${level === 'manage' ? 'text-emerald-700' : 'text-blue-700'}`}>{ACCESS_LABELS[level]}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-slate-600">Only the dashboard. Their role has no modules yet.</p>
            )}
          </div>

          {canViewActivity && <RecentActivity staff={staff} />}

          {canManageAccounts && !isSelf && (
            <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
              <Button variant="outline" size="sm" icon={Pencil} onClick={onEdit}>Edit details</Button>
              {staff.status === 'active' && (
                <Button variant="outline" size="sm" icon={KeyRound} onClick={() => setConfirm('password')}>
                  {setupPending ? 'Resend invite' : 'Send new password'}
                </Button>
              )}
              {staff.status === 'active' ? (
                <Button variant="ghost" size="sm" icon={UserX} className="text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => setConfirm('deactivate')}>
                  Deactivate
                </Button>
              ) : (
                <Button variant="outline" size="sm" icon={UserCheck} onClick={() => setConfirm('reactivate')}>Reactivate</Button>
              )}
            </div>
          )}
          {canManageAccounts && isSelf && (
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
              <Button variant="outline" size="sm" icon={Pencil} onClick={onEdit}>Edit my details</Button>
              <p className="text-xs text-slate-500">You can't deactivate your own account or change your own role.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(next) => !next && !run.isPending && setConfirm(null)}
        title={pending?.title}
        description={pending?.description}
        confirmLabel={pending?.confirmLabel}
        variant={pending?.variant}
        busy={run.isPending}
        onConfirm={() => run.mutate({ action: confirm })}
      />
    </>
  )
}

/** The last few things this person did, with a link to their full activity. */
function RecentActivity({ staff }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'activityLogs', 'staff', staff.id],
    queryFn: () => adminService.getActivityLogs({ user_type: 'administrator', user_id: staff.id, per_page: 5 }),
  })
  const logs = data?.logs?.data ?? []

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900">Recent activity</h3>
        <Link
          to={`/admin/activity-logs?user_type=administrator&user_id=${staff.id}`}
          className="text-xs font-bold text-brand-navy hover:underline"
        >
          See all activity →
        </Link>
      </div>
      {isLoading ? (
        <p className="mt-2 text-sm text-slate-500">Loading…</p>
      ) : logs.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Nothing recorded yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {logs.map((log) => (
            <li key={log.log_id} className="px-3 py-2 text-sm">
              <p className="text-slate-800">{log.description || log.action}</p>
              <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(log.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words font-medium text-slate-900">{value || <span className="text-slate-400">—</span>}</dd>
    </div>
  )
}
