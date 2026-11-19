import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { GripVertical, MapPin } from 'lucide-react'
import { getVacancyApplications } from '@/services/employerApplicationService'
import { ErrorState } from '@/components/ui'
import { PIPELINE_TABS, TERMINAL_STATUSES } from './atsConstants'
import { getInitials, getMatchTone, timeAgo } from './atsFormatters'
import { InterviewPhaseChip } from './InterviewSummary'

const COLUMN_LIMIT = 50

/** Where a card in each column may go. Nothing moves back to the inbox, and final stages stay put. */
const MOVES = {
  pending: ['reviewed', 'shortlisted', 'interview', 'hired', 'rejected'],
  reviewed: ['shortlisted', 'interview', 'hired', 'rejected'],
  shortlisted: ['interview', 'hired', 'rejected'],
  interview: ['hired', 'rejected'],
  hired: [],
  rejected: [],
}

const LABELS = Object.fromEntries(PIPELINE_TABS.map((tab) => [tab.id, tab.label]))

const boardColumnKey = (vacancyId, status, search, sortBy, sortDir) => (
  ['vacancyApplications', vacancyId, 'board', status, search, sortBy, sortDir]
)

/**
 * Kanban view of one vacancy's pipeline. Dragging (mouse, touch or keyboard)
 * and each card's "Move to" menu both call `onMove(application, status)`; the
 * page decides whether that needs the interview, hire or reject dialog first.
 */
export default function ApplicantBoard({ vacancyId, search, sortBy, sortDir, counts, onMove, onOpen, disabled }) {
  const [dragging, setDragging] = useState(null)

  const columns = useQueries({
    queries: PIPELINE_TABS.map((tab) => ({
      queryKey: boardColumnKey(vacancyId, tab.id, search, sortBy, sortDir),
      queryFn: () => getVacancyApplications(vacancyId, {
        status: tab.id,
        search: search || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
        per_page: COLUMN_LIMIT,
        page: 1,
      }),
      staleTime: 30_000,
      refetchInterval: 30_000,
    })),
  })

  const byId = useMemo(() => {
    const map = new Map()
    columns.forEach((column, index) => {
      for (const app of column.data?.data ?? []) map.set(String(app.apply_id), { app, status: PIPELINE_TABS[index].id })
    })
    return map
  }, [columns])

  const sensors = useSensors(
    // A small distance keeps clicks on the name and menu working as clicks.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )

  const nameOf = (id) => byId.get(String(id))?.app?.seeker?.name ?? 'Applicant'

  const announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}. Use the arrow keys to choose a stage, then press space to drop.`,
    onDragOver: ({ active, over }) => (over ? `${nameOf(active.id)} is over ${LABELS[over.id]}.` : `${nameOf(active.id)} is not over a stage.`),
    onDragEnd: ({ active, over }) => (over ? `${nameOf(active.id)} dropped on ${LABELS[over.id]}.` : `${nameOf(active.id)} was put back.`),
    onDragCancel: ({ active }) => `Moving ${nameOf(active.id)} was cancelled.`,
  }

  const handleDragEnd = ({ active, over }) => {
    setDragging(null)
    const entry = byId.get(String(active.id))
    if (!entry || !over) return
    if (!MOVES[entry.status]?.includes(over.id)) return
    onMove(entry.app, over.id)
  }

  const draggingEntry = dragging ? byId.get(String(dragging)) : null

  return (
    <DndContext
      sensors={sensors}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: 'To move an applicant, press space or enter, use the arrow keys to choose a stage, then press space again. Press escape to cancel.' },
      }}
      onDragStart={({ active }) => setDragging(active.id)}
      onDragCancel={() => setDragging(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="no-scrollbar flex gap-3 overflow-x-auto p-4" role="list" aria-label="Hiring stages">
        {PIPELINE_TABS.map((tab, index) => {
          const column = columns[index]
          const allowed = draggingEntry ? MOVES[draggingEntry.status]?.includes(tab.id) : false
          return (
            <Column
              key={tab.id}
              tab={tab}
              query={column}
              total={counts[tab.id] ?? column.data?.total ?? 0}
              dropAllowed={allowed}
              dragActive={Boolean(draggingEntry)}
              disabled={disabled}
              onMove={onMove}
              onOpen={onOpen}
            />
          )
        })}
      </div>
      <DragOverlay dropAnimation={null}>
        {draggingEntry ? <CardBody app={draggingEntry.app} status={draggingEntry.status} overlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function Column({ tab, query, total, dropAllowed, dragActive, disabled, onMove, onOpen }) {
  // Always registered (dnd-kit measures drop zones when a drag starts); disallowed
  // stages are refused in handleDragEnd and just don't light up.
  const { setNodeRef, isOver } = useDroppable({ id: tab.id })
  const apps = query.data?.data ?? []
  const TabIcon = tab.icon

  const ring = isOver && dropAllowed
    ? 'border-brand-navy bg-[#e8f0fc] ring-2 ring-brand-navy/30'
    : dragActive && dropAllowed
      ? 'border-dashed border-brand-navy/50 bg-slate-50'
      : dragActive
        ? 'border-slate-200 bg-slate-50 opacity-60'
        : 'border-slate-200 bg-slate-50'

  return (
    <section
      ref={setNodeRef}
      role="listitem"
      aria-label={`${tab.label}, ${total} ${total === 1 ? 'applicant' : 'applicants'}`}
      className={`flex w-72 shrink-0 flex-col rounded-2xl border transition-colors ${ring}`}
    >
      <header className="flex items-center justify-between px-3 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <TabIcon className="h-4 w-4 text-slate-400" aria-hidden="true" />
          {tab.label}
        </h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">{total}</span>
      </header>

      <div className="flex max-h-[calc(100vh-22rem)] min-h-[8rem] flex-col gap-2 overflow-y-auto px-2 pb-2">
        {query.isLoading && [0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-white" />)}
        {query.isError && <ErrorState size="sm" title="Couldn't load" description="" onRetry={() => query.refetch()} />}
        {!query.isLoading && !query.isError && apps.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-slate-500">No one in this stage.</p>
        )}
        {apps.map((app) => (
          <DraggableCard key={app.apply_id} app={app} status={tab.id} disabled={disabled} onMove={onMove} onOpen={onOpen} />
        ))}
        {total > apps.length && apps.length > 0 && (
          <p className="px-2 py-2 text-center text-xs text-slate-500">Showing {apps.length} of {total}. Switch to the table to see everyone.</p>
        )}
      </div>
    </section>
  )
}

function DraggableCard({ app, status, disabled, onMove, onOpen }) {
  const moves = MOVES[status] ?? []
  const locked = disabled || moves.length === 0 || TERMINAL_STATUSES.includes(status)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: String(app.apply_id), disabled: locked })
  const name = app.seeker?.name || 'Applicant'

  return (
    <article
      ref={setNodeRef}
      className={`rounded-xl border border-slate-200 bg-white shadow-sm transition ${isDragging ? 'opacity-40' : 'hover:border-slate-300'}`}
    >
      <CardBody
        app={app}
        status={status}
        onOpen={() => onOpen(app)}
        handle={!locked && (
          <button
            type="button"
            {...listeners}
            {...attributes}
            aria-label={`Drag ${name} to another stage`}
            className="-ml-1 cursor-grab touch-none rounded-md p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      />
      {!locked && (
        <div className="border-t border-slate-100 px-3 py-2">
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <span className="shrink-0">Move to</span>
            <select
              value=""
              onChange={(e) => { if (e.target.value) onMove(app, e.target.value) }}
              aria-label={`Move ${name} to`}
              className="w-full cursor-pointer rounded-lg border border-slate-200 bg-white py-1 pl-2 pr-7 text-xs text-slate-700 focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-focus"
            >
              <option value="">Choose a stage</option>
              {moves.map((target) => <option key={target} value={target}>{LABELS[target]}</option>)}
            </select>
          </label>
        </div>
      )}
    </article>
  )
}

function CardBody({ app, status, handle, onOpen, overlay = false }) {
  const seeker = app.seeker || {}
  const match = Number.parseFloat(app.match_percentage)

  return (
    <div className={`flex gap-2.5 p-3 ${overlay ? 'w-72 rotate-1 rounded-xl border border-brand-navy bg-white shadow-elevated' : ''}`}>
      {handle}
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f0fc] text-xs font-bold text-brand-navy" aria-hidden="true">
        {getInitials(seeker.name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          {onOpen ? (
            <button type="button" onClick={onOpen} className="truncate text-left text-sm font-semibold text-slate-900 hover:text-brand-navy hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus">
              {seeker.name}
            </button>
          ) : (
            <span className="truncate text-sm font-semibold text-slate-900">{seeker.name}</span>
          )}
          {Number.isFinite(match) && (
            <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] font-bold ${getMatchTone(app.match_percentage)}`}>{match.toFixed(0)}%</span>
          )}
        </div>
        {seeker.address && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{seeker.address}</span>
          </p>
        )}
        <p className="mt-1 text-xs text-slate-400">Applied {timeAgo(app.applied_at)}</p>
        {status === 'interview' && <InterviewPhaseChip interview={app.interview} />}
      </div>
    </div>
  )
}
