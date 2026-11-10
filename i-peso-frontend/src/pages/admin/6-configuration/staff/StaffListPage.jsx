import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GraduationCap, MailCheck, Search, UserPlus, UserX, UsersRound } from 'lucide-react'
import { Badge, Card } from '@/components/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PageHeader from '@/pages/admin/_components/PageHeader'
import StatCard from '@/pages/admin/_components/StatCard'
import DataTable from '@/pages/admin/_components/DataTable'
import { staffService } from '@/services/staffService'
import { useAuthStore } from '@/stores/authStore'
import { canOpen, isSystemAdministrator } from '@/utils/adminAccess'
import StaffFormDialog from './components/StaffFormDialog'
import StaffDetailDialog from './components/StaffDetailDialog'
import TemporaryPasswordDialog from './components/TemporaryPasswordDialog'
import OrgChart from './components/OrgChart'
import OjtInternsPanel from '../ojt/components/OjtInternsPanel'
import { ACCOUNT_STATUS, accountStatus, formatDateTime, initialsOf } from './staffDisplay'

const STAFF_KEY = ['admin', 'staff']

export default function StaffListPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canManageAccounts = isSystemAdministrator(user)

  const [search, setSearch] = useState('')
  const [positionFilter, setPositionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(null) // { staff } — staff is null when adding
  const [passwordResult, setPasswordResult] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = ['directory', 'org-chart', 'ojt'].includes(searchParams.get('tab')) ? searchParams.get('tab') : 'directory'
  const setTab = (next) => setSearchParams(next === 'directory' ? {} : { tab: next }, { replace: true })

  const staffQuery = useQuery({ queryKey: STAFF_KEY, queryFn: staffService.getStaff })

  const staff = useMemo(() => staffQuery.data?.data ?? [], [staffQuery.data])
  const positions = staffQuery.data?.positions ?? []
  const selected = staff.find((member) => member.id === selectedId) ?? null

  const counts = useMemo(() => ({
    active: staff.filter((member) => member.account_status === 'active').length,
    invited: staff.filter((member) => member.account_status === 'invited' || member.account_status === 'invite_expired').length,
    interns: staff.filter((member) => member.position === 'ojt_intern' && member.status === 'active').length,
    deactivated: staff.filter((member) => member.account_status === 'deactivated' || member.account_status === 'internship_ended').length,
  }), [staff])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return staff.filter((member) => {
      if (positionFilter && member.position !== positionFilter) return false
      if (statusFilter && member.account_status !== statusFilter) return false
      if (!term) return true
      return [member.name, member.email, member.position_label]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    })
  }, [staff, search, positionFilter, statusFilter])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: STAFF_KEY })
    queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] })
  }

  // After an add, edit, deactivate, reactivate or new password.
  const handleChanged = (data) => {
    refresh()
    if (data?.temporary_password) setPasswordResult(data)
  }

  const handleSaved = (data) => {
    const wasEdit = !!form?.staff
    setForm(null)
    if (data.email_sent !== false) toast.success(data.message)
    handleChanged(data)
    if (wasEdit && data.staff) setSelectedId(data.staff.id)
  }

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (_, member) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-700">
            {initialsOf(member.name)}
          </span>
          <div className="min-w-0">
            {/* A real button so the profile opens from the keyboard too (rows are click-only). */}
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); setSelectedId(member.id) }}
              className="max-w-full truncate text-left font-bold text-slate-900 hover:text-brand-navy hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/40"
            >
              {member.name}
              {member.id === user?.id && <span className="ml-2 text-xs font-semibold text-slate-400">(you)</span>}
            </button>
            <p className="truncate text-xs text-slate-500">{member.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'position_label', label: 'Position', render: (value) => value ?? <span className="text-slate-400">Not set</span> },
    {
      key: 'account_status',
      label: 'Status',
      render: (_, member) => {
        const status = accountStatus(member)
        return <Badge status={status.variant}>{status.label}</Badge>
      },
    },
    {
      key: 'last_login_at',
      label: 'Last sign-in',
      render: (value) => <span className="text-sm text-slate-600">{formatDateTime(value) ?? 'Never'}</span>,
    },
  ]

  return (
    <div className="portal-page">
      <PageHeader
        title="Staff Management"
        subtitle="PESO Urdaneta staff and interns, their positions, and what each can open in i-PESO."
        eyebrow="Configuration"
        actions={canManageAccounts ? [
          { label: 'Add staff member', icon: UserPlus, onClick: () => setForm({ staff: null }), variant: 'primary' },
        ] : []}
      />

      {!canManageAccounts && (
        <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          You can view staff here. Only the system administrator can add staff or change accounts.
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={UsersRound} color="blue" label="Active accounts" value={counts.active.toLocaleString()} subtitle="Signed in and set up" />
        <StatCard icon={MailCheck} color="amber" label="Waiting to set up" value={counts.invited.toLocaleString()} subtitle="Invited, password not set yet" />
        <StatCard icon={GraduationCap} color="green" label="OJT / Interns" value={counts.interns.toLocaleString()} subtitle="Active intern accounts" />
        <StatCard icon={UserX} color="red" label="Deactivated" value={counts.deactivated.toLocaleString()} subtitle="Can no longer sign in" />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="directory">Staff directory</TabsTrigger>
          <TabsTrigger value="org-chart">Org chart</TabsTrigger>
          <TabsTrigger value="ojt">OJT / Interns</TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <Card padding="none" className="mt-4">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:p-5">
              <label className="relative flex-1">
                <span className="sr-only">Search staff</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, email or position"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
                />
              </label>
              <select
                aria-label="Filter by position"
                value={positionFilter}
                onChange={(event) => setPositionFilter(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
              >
                <option value="">All positions</option>
                {positions.map((position) => <option key={position.value} value={position.value}>{position.label}</option>)}
              </select>
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
              >
                <option value="">All statuses</option>
                {Object.entries(ACCOUNT_STATUS).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>

            <DataTable
              columns={columns}
              data={filtered}
              loading={staffQuery.isLoading}
              error={staffQuery.error}
              onRetry={staffQuery.refetch}
              onRowClick={(member) => setSelectedId(member.id)}
              caption="PESO staff directory. Select a row to open the staff profile."
              emptyTitle={staff.length ? 'No staff match these filters' : 'No staff yet'}
              emptyDescription={staff.length ? 'Try a different search or clear the filters.' : 'Add your first staff member to send them their sign-in details.'}
            />
          </Card>
        </TabsContent>

        <TabsContent value="org-chart">
          <Card className="mt-4">
            <OrgChart onSelect={(member) => setSelectedId(member.id)} />
          </Card>
        </TabsContent>

        <TabsContent value="ojt">
          <OjtInternsPanel />
        </TabsContent>
      </Tabs>

      <StaffDetailDialog
        staff={selected}
        canManageAccounts={canManageAccounts}
        canViewActivity={canOpen(user, 'activity_logs')}
        isSelf={selected?.id === user?.id}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onEdit={() => { setForm({ staff: selected }); setSelectedId(null) }}
        onChanged={handleChanged}
      />

      {form && (
        <StaffFormDialog
          open
          key={form.staff?.id ?? 'new'}
          staff={form.staff}
          positions={positions}
          isSelf={form.staff?.id === user?.id}
          onOpenChange={(open) => !open && setForm(null)}
          onSaved={handleSaved}
        />
      )}

      <TemporaryPasswordDialog result={passwordResult} onClose={() => setPasswordResult(null)} />
    </div>
  )
}
