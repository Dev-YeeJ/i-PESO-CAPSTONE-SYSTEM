import { useQuery } from '@tanstack/react-query'
import { ErrorState, LoadingSkeleton } from '@/components/ui'
import { staffService } from '@/services/staffService'
import { initialsOf } from '../staffDisplay'

/**
 * PESO Urdaneta's organizational chart, filled in with the active staff in
 * each position: the Office Manager (the system administrator) on top, the Special Law Enforcement
 * Officer and Administrative Aides reporting to them, and OJT interns below.
 */
export default function OrgChart({ onSelect }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'staff', 'orgChart'],
    queryFn: staffService.getOrgChart,
  })

  if (isLoading) return <LoadingSkeleton variant="card" rows={3} />
  if (error) return <ErrorState description="The org chart could not be loaded." onRetry={refetch} error={error} />

  const byKey = Object.fromEntries((data?.positions ?? []).map((position) => [position.value, position]))
  const top = byKey.peso_office_manager
  const middle = [byKey.special_law_enforcement_officer, byKey.administrative_aide].filter(Boolean)
  const interns = byKey.ojt_intern

  return (
    <div className="overflow-x-auto pb-2">
      <div className="mx-auto flex min-w-[640px] max-w-4xl flex-col items-center">
        {top && <PositionBox position={top} onSelect={onSelect} highlight />}

        {middle.length > 0 && (
          <>
            <Connector />
            <div className="relative grid w-full grid-cols-2 gap-6 pt-5">
              {/* horizontal bar joining the second row */}
              <span aria-hidden className="absolute left-1/4 right-1/4 top-0 h-px bg-slate-300" />
              {middle.map((position) => (
                <div key={position.value} className="relative flex flex-col items-center">
                  <span aria-hidden className="absolute -top-5 h-5 w-px bg-slate-300" />
                  <PositionBox position={position} onSelect={onSelect} />
                </div>
              ))}
            </div>
          </>
        )}

        {interns && (
          <>
            <Connector />
            <PositionBox position={interns} onSelect={onSelect} muted />
          </>
        )}

        {data?.unassigned?.length > 0 && (
          <div className="mt-8 w-full rounded-xl border border-dashed border-slate-300 p-4">
            <p className="text-sm font-bold text-slate-700">No position set</p>
            <p className="text-xs text-slate-500">Edit these accounts to place them on the chart.</p>
            <MemberList members={data.unassigned} onSelect={onSelect} />
          </div>
        )}
      </div>
    </div>
  )
}

function Connector() {
  return <span aria-hidden className="h-6 w-px bg-slate-300" />
}

function PositionBox({ position, onSelect, highlight = false, muted = false }) {
  const tone = highlight
    ? 'border-brand-navy bg-brand-navy text-white'
    : muted
      ? 'border-slate-200 bg-slate-50 text-slate-900'
      : 'border-slate-300 bg-white text-slate-900'

  return (
    <section className={`w-full max-w-sm rounded-xl border-2 shadow-sm ${tone}`} aria-label={position.label}>
      <header className="px-4 pb-2 pt-3 text-center">
        <p className={`text-sm font-extrabold leading-snug ${highlight ? 'text-white' : 'text-slate-950'}`}>{position.title}</p>
        <p className={`mt-0.5 text-xs ${highlight ? 'text-blue-100' : 'text-slate-500'}`}>
          {position.members.length === 0 ? 'Vacant' : `${position.members.length} ${position.members.length === 1 ? 'person' : 'people'}`}
        </p>
      </header>
      {position.members.length > 0 && (
        <div className={`rounded-b-[10px] px-2 pb-2 ${highlight ? 'bg-white/10' : ''}`}>
          <MemberList members={position.members} onSelect={onSelect} inverted={highlight} />
        </div>
      )}
    </section>
  )
}

function MemberList({ members, onSelect, inverted = false }) {
  return (
    <ul className="mt-1 space-y-1">
      {members.map((member) => (
        <li key={member.id}>
          <button
            type="button"
            onClick={() => onSelect?.(member)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition ${inverted ? 'hover:bg-white/15' : 'hover:bg-slate-100'}`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${inverted ? 'bg-brand-gold text-brand-navy' : 'bg-slate-200 text-slate-700'}`}>
              {initialsOf(member.name)}
            </span>
            <span className={`truncate font-semibold ${inverted ? 'text-white' : 'text-slate-800'}`}>{member.name}</span>
            {member.account_status === 'invited' && (
              <span className={`ml-auto shrink-0 text-[11px] font-bold ${inverted ? 'text-amber-200' : 'text-amber-700'}`}>Invited</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}
