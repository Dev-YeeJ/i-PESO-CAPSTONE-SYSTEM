import { useMemo, useState } from 'react'
import { flexRender, getCoreRowModel, getSortedRowModel, getFilteredRowModel, useReactTable } from '@tanstack/react-table'
import { Badge, Button } from '@/components/ui'
import { ChevronDown, ChevronUp, FileText, Search } from 'lucide-react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

export default function JobFairEmployersTable({ participants, onReviewRequirements, onManualStatus, statusTones, manualStatusActions }) {
  const [sorting, setSorting] = useState([])
  const [globalFilter, setGlobalFilter] = useState('')

  const columns = useMemo(() => [
    {
      accessorKey: 'company_name',
      header: 'Employer',
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{row.original.company_name}</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            {row.original.source?.replaceAll('_', ' ')} · {row.original.confirmation_channel || 'no channel'}
          </p>
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
        const approvedReqs = (p.requirements ?? []).filter((r) => r.status === 'approved').length
        return (
          <button
            type="button"
            onClick={() => onReviewRequirements(p.id)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{totalReqs ? `${approvedReqs}/${totalReqs} approved` : 'View'}</span>
          </button>
        )
      }
    },
    {
      id: 'actions',
      header: 'Manual Override',
      cell: ({ row }) => {
        const p = row.original
        return (
          <Select value="" onValueChange={(value) => onManualStatus(p.id, value)}>
            <SelectTrigger className="w-full min-w-[160px] bg-white border-slate-200 hover:bg-slate-50 text-xs">
              <SelectValue placeholder="Record event…" />
            </SelectTrigger>
            <SelectContent>
              {manualStatusActions.map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-xs font-semibold">{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }
    }
  ], [onReviewRequirements, onManualStatus, statusTones, manualStatusActions])

  const table = useReactTable({
    data: participants,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={globalFilter ?? ''}
          onChange={e => setGlobalFilter(e.target.value)}
          placeholder="Filter employers..."
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-4 py-3 font-bold tracking-wider">
                      {header.isPlaceholder ? null : (
                        <div
                          className={`flex items-center gap-2 ${header.column.getCanSort() ? 'cursor-pointer select-none' : ''}`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: <ChevronUp className="h-4 w-4" />,
                            desc: <ChevronDown className="h-4 w-4" />
                          }[header.column.getIsSorted()] ?? null}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-200">
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="p-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="p-8 text-center text-slate-500">
                    No matching employers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
