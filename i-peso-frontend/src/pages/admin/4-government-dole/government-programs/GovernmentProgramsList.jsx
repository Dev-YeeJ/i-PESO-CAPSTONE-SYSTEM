import { Archive, Eye, Pencil, UsersRound } from 'lucide-react'
import { createElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { categoryLabel, categoryTone, statusLabel, statusTone } from '@/components/government-programs/programConstants'

const formatDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline'

export default function GovernmentProgramsList({ programs, loading, onArchive }) {
  const navigate = useNavigate()

  if (loading) {
    return <div className="py-14 text-center text-sm font-semibold text-slate-500">Loading programs...</div>
  }

  if (!programs.length) {
    return (
      <div className="py-14 text-center">
        <p className="font-extrabold text-slate-800">No programs match these filters.</p>
        <p className="mt-1 text-sm text-slate-500">Adjust the search or publish a new PESO program.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-left">
        <thead className="bg-slate-50 text-xs font-extrabold uppercase text-slate-500">
          <tr>
            <th className="px-5 py-3">Program</th>
            <th className="px-5 py-3">Schedule</th>
            <th className="px-5 py-3">Capacity</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {programs.map((program) => (
            <tr key={program.program_id} className="align-top hover:bg-slate-50/70">
              <td className="max-w-md px-5 py-4">
                <p className="font-extrabold text-slate-950">{program.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${categoryTone[program.category] ?? categoryTone.other}`}>{categoryLabel(program.category)}</span>
                  <span className="text-xs font-semibold text-slate-500">{program.applications_count ?? 0} applicants</span>
                </div>
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                <p>{formatDate(program.start_date)}</p>
                <p className="mt-1 text-xs text-slate-400">Deadline {formatDate(program.application_deadline)}</p>
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-slate-700">
                {program.total_slots === 0 ? 'Open' : `${program.available_slots} / ${program.total_slots}`}
              </td>
              <td className="px-5 py-4">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${statusTone[program.status] ?? statusTone.draft}`}>{statusLabel(program.status)}</span>
              </td>
              <td className="px-5 py-4">
                <div className="flex justify-end gap-1">
                  <IconButton title="View program" onClick={() => navigate(`/admin/government-programs/${program.program_id}`)} icon={Eye} />
                  <IconButton title="Edit program" onClick={() => navigate(`/admin/government-programs/${program.program_id}/edit`)} icon={Pencil} />
                  <IconButton title="Manage applicants" onClick={() => navigate(`/admin/government-programs/${program.program_id}/applications`)} icon={UsersRound} />
                  {program.status !== 'archived' && <IconButton title="Archive program" onClick={() => onArchive(program)} icon={Archive} danger />}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function IconButton({ title, onClick, icon: Icon, danger = false }) {
  return (
    <button type="button" onClick={onClick} title={title} aria-label={title} className={`rounded-lg p-2 transition ${danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-500 hover:bg-slate-100 hover:text-blue-900'}`}>
      {createElement(Icon, { className: 'h-4 w-4' })}
    </button>
  )
}
