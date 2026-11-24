import { useMemo, useState } from 'react'
import { flexRender, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table'
import { Badge, Button } from '@/components/ui'
import { ChevronDown, ChevronUp, FileText, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function JobFairEmployersTable({ participants, onReviewRequirements, statusTones }) {
  const [sorting, setSorting] = useState([])
  const [globalFilter, setGlobalFilter] = useState('')

  const columns = useMemo(() => [
    {
      accessorKey: 'company_name',
      header: 'Employer',
      cell: ({ row }) => (
        <div className="flex items-center gap-3 py-1">
          <EmployerLogo employer={row.original} className="h-10 w-10 rounded-lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{row.original.company_name}</p>
            {row.original.representative_name && (
              <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                Rep: {row.original.representative_name}
              </p>
            )}
          </div>
        </div>
      )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const p = row.original
        return (
          <Badge variant={statusTones[p.status] ?? 'neutral'} icon={false} className="whitespace-nowrap font-bold">
            {p.status.replaceAll('_', ' ')}
          </Badge>
        )
      }
    },
    {
      id: 'requirements',
      header: 'Requirements',
      cell: ({ row }) => {
        const p = row.original
        const totalReqs = p.total_requirements || 0
        const approvedReqs = (() => {
          const validIds = new Set(p.valid_requirement_ids || [])
          const reqs = (p.requirements ?? []).filter(r => validIds.has(r.job_fair_requirement_id))
          const grouped = reqs.reduce((acc, r) => {
            if (!acc[r.job_fair_requirement_id]) acc[r.job_fair_requirement_id] = []
            acc[r.job_fair_requirement_id].push(r)
            return acc
          }, {})
          let count = 0
          for (const key in grouped) {
            if (grouped[key].length > 0 && grouped[key].every(s => s.status === 'approved')) {
              count++
            }
          }
          return count
        })()
        return (
          <button
            type="button"
            onClick={() => onReviewRequirements(p.id)}
            className="flex items-center gap-1.5 rounded-lg bg-[#e8f0fc] px-3 py-1.5 text-xs font-bold text-brand-navy transition hover:bg-[#e8f0fc]"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{totalReqs ? `${approvedReqs}/${totalReqs} approved` : 'View'}</span>
          </button>
        )
      }
    },
  ], [onReviewRequirements, statusTones])

  const table = useReactTable({
    data: participants,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={globalFilter ?? ''}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Search employers..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm shadow-sm transition-colors focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {table.getRowModel().rows.length ? (
          table.getRowModel().rows.map(row => (
            <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between">
              <div className="flex items-start gap-4">
                <EmployerLogo employer={row.original} className="h-12 w-12 rounded-xl border border-slate-100 text-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-slate-900 leading-tight mb-1">{row.original.company_name}</p>
                  {row.original.representative_name ? (
                    <p className="truncate text-xs font-semibold text-slate-500 mb-2">
                      Rep: {row.original.representative_name}
                    </p>
                  ) : (
                    <div className="h-4 mb-2"></div>
                  )}
                  <Badge variant={statusTones[row.original.status] ?? 'neutral'} icon={false} className="text-xs">
                    {row.original.status.replaceAll('_', ' ')}
                  </Badge>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => onReviewRequirements(row.original.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-[#e8f0fc] px-4 py-2 text-xs font-bold text-brand-navy transition hover:bg-[#0f2d56] hover:text-white group w-full justify-center"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {(() => {
                      if (!row.original.total_requirements) return 'View Details'
                      const validIds = new Set(row.original.valid_requirement_ids || [])
                      const reqs = (row.original.requirements ?? []).filter(r => validIds.has(r.job_fair_requirement_id))
                      const grouped = reqs.reduce((acc, r) => {
                        if (!acc[r.job_fair_requirement_id]) acc[r.job_fair_requirement_id] = []
                        acc[r.job_fair_requirement_id].push(r)
                        return acc
                      }, {})
                      let count = 0
                      for (const key in grouped) {
                        if (grouped[key].length > 0 && grouped[key].every(s => s.status === 'approved')) {
                          count++
                        }
                      }
                      return `${count} / ${row.original.total_requirements} Reqs Approved`
                    })()}
                  </span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full h-32 flex items-center justify-center rounded-xl border border-slate-200 bg-white">
            <p className="text-sm font-medium text-slate-500">No employers found.</p>
          </div>
        )}
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs font-semibold text-slate-500">
            Showing <span className="text-slate-900">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</span> to <span className="text-slate-900">{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)}</span> of <span className="text-slate-900">{table.getFilteredRowModel().rows.length}</span> results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * The employer's logo, or their initial when there is none or the file can't be loaded
 * (e.g. it was deleted), instead of a broken image. Uses company_logo_url: company_logo
 * is the stored path, which the browser would resolve against the current page.
 */
function EmployerLogo({ employer, className = '' }) {
  const [failed, setFailed] = useState(false)
  const name = employer.company_name || 'Employer'
  if (employer.company_logo_url && !failed) {
    return <img src={employer.company_logo_url} alt={`${name} logo`} onError={() => setFailed(true)} className={`shrink-0 object-cover ${className}`} />
  }
  return (
    <div className={`flex shrink-0 items-center justify-center bg-[#e8f0fc] font-bold text-brand-navy ${className}`} aria-hidden="true">
      {name.substring(0, 1).toUpperCase()}
    </div>
  )
}
