import { useCallback, useEffect, useState } from 'react'
import { Check, Eye, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import PageHeader from '@/pages/admin/_components/PageHeader'
import DataTable from '@/pages/admin/_components/DataTable'
import StatusBadge from '@/pages/admin/_components/StatusBadge'
import { adminService } from '@/services/adminService'

const requestMessage = (error, fallback) => (
  error.response?.data?.error
  ?? error.response?.data?.message
  ?? fallback
)

export default function EmployersListPage() {
  const [view, setView] = useState('pending')
  const [employers, setEmployers] = useState([])
  const [loading, setLoading] = useState(true)
  const [rejectingEmployer, setRejectingEmployer] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const navigate = useNavigate()

  const loadEmployers = useCallback(async () => {
    setLoading(true)
    try {
      const result = view === 'pending'
        ? await adminService.getPendingEmployers()
        : await adminService.getEmployers({ per_page: 50 })
      setEmployers(view === 'pending' ? result.employers ?? [] : result.data ?? [])
    } catch (error) {
      toast.error(requestMessage(error, 'Unable to load employers.'))
    } finally {
      setLoading(false)
    }
  }, [view])

  useEffect(() => {
    loadEmployers()
  }, [loadEmployers])

  const approveEmployer = async (employer) => {
    if (!employer.all_required_approved) {
      toast.error('Review and approve all required documents first.')
      navigate(`/admin/employers/${employer.employer_id}`)
      return
    }

    const previous = employers
    setEmployers((current) => current.filter((item) => item.employer_id !== employer.employer_id))
    const toastId = toast.loading(`Approving ${employer.company_name}...`)

    try {
      await adminService.approveEmployer(employer.employer_id)
      toast.success(`${employer.company_name} is now verified.`, { id: toastId })
    } catch (error) {
      setEmployers(previous)
      toast.error(requestMessage(error, 'Unable to approve this employer.'), { id: toastId })
    }
  }

  const rejectEmployer = async () => {
    if (rejectionReason.trim().length < 10) {
      toast.error('Enter a rejection reason of at least 10 characters.')
      return
    }

    const employer = rejectingEmployer
    const previous = employers
    setRejecting(true)
    setEmployers((current) => current.filter((item) => item.employer_id !== employer.employer_id))
    setRejectingEmployer(null)
    const toastId = toast.loading(`Rejecting ${employer.company_name}...`)

    try {
      await adminService.rejectEmployer(employer.employer_id, rejectionReason.trim())
      toast.success(`${employer.company_name} was notified of the decision.`, { id: toastId })
      setRejectionReason('')
    } catch (error) {
      setEmployers(previous)
      setRejectingEmployer(employer)
      toast.error(requestMessage(error, 'Unable to reject this employer.'), { id: toastId })
    } finally {
      setRejecting(false)
    }
  }

  const pendingColumns = [
    {
      key: 'company_name',
      label: 'Company',
      render: (name, row) => (
        <div>
          <p className="font-semibold text-slate-900">{name}</p>
          <p className="text-xs capitalize text-slate-500">{row.company_type?.replaceAll('_', ' ')}</p>
        </div>
      ),
    },
    { key: 'email', label: 'Email' },
    {
      key: 'approved_required_documents_count',
      label: 'Required Documents',
      render: (approved, row) => (
        <div>
          <p className="font-semibold">{approved}/{row.required_documents_count} approved</p>
          <p className={`text-xs ${row.all_required_approved ? 'text-green-700' : 'text-amber-700'}`}>
            {row.all_required_approved ? 'Ready for final approval' : 'Document review needed'}
          </p>
        </div>
      ),
    },
    {
      key: 'created_at',
      label: 'Submitted',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            title="Open full review"
            onClick={() => navigate(`/admin/employers/${row.employer_id}`)}
            className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-100"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Reject employer"
            onClick={() => {
              setRejectingEmployer(row)
              setRejectionReason('')
            }}
            className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            title={row.all_required_approved ? 'Approve employer' : 'Review required documents first'}
            onClick={() => approveEmployer(row)}
            className={`rounded-lg p-2 text-white ${
              row.all_required_approved ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-400'
            }`}
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  const allColumns = [
    { key: 'company_name', label: 'Company' },
    { key: 'representative_name', label: 'Representative' },
    { key: 'email', label: 'Email' },
    { key: 'documents_count', label: 'Documents' },
    {
      key: 'verification_status',
      label: 'Verification',
      render: (status) => <StatusBadge status={status ?? 'pending'} />,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Employers" subtitle="Review accreditation and manage registered employers" />

      <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
        {[
          ['pending', 'Pending Review'],
          ['all', 'All Employers'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setView(value)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              view === value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <DataTable
        columns={view === 'pending' ? pendingColumns : allColumns}
        data={employers}
        loading={loading}
        emptyMessage={view === 'pending' ? 'No employers are waiting for review.' : 'No employers found.'}
        onRowClick={(row) => navigate(`/admin/employers/${row.employer_id}`)}
      />

      {rejectingEmployer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Reject employer application</h2>
            <p className="mt-2 text-sm text-slate-600">
              Explain what {rejectingEmployer.company_name} must correct. This reason will appear in both email and the employer dashboard.
            </p>
            <textarea
              autoFocus
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              rows={4}
              placeholder="Example: The submitted Mayor's Permit is expired. Please upload a current copy."
              className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                disabled={rejecting}
                onClick={() => setRejectingEmployer(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejecting}
                onClick={rejectEmployer}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Reject and Notify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
