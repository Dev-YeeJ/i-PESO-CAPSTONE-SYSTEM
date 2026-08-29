import { useMemo } from 'react'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui'

export function DataTable({
  columns,
  data,
  loading = false,
  error = null,
  onRetry,
  onRowClick,
  emptyMessage = 'No data available',
  emptyTitle,
  emptyDescription,
  emptyAction,
  caption,
}) {
  const tableColumns = useMemo(
    () => columns.map((column) => ({
      accessorKey: column.key ?? column.id,
      header: column.label,
      cell: (info) => {
        const value = info.getValue()
        return column.render ? column.render(value, info.row.original) : value
      },
    })),
    [columns],
  )

  const table = useReactTable({
    data: data ?? [],
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  const rows = table.getRowModel().rows

  if (loading) {
    return <LoadingSkeleton variant="table" rows={8} columns={columns.length || 4} />
  }

  if (error) {
    const message = typeof error === 'string'
      ? error
      : (error?.response?.data?.message ?? error?.message)
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <ErrorState
          description={message}
          onRetry={onRetry}
          error={typeof error === 'string' ? undefined : error}
        />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <EmptyState title={emptyTitle ?? emptyMessage} description={emptyDescription} action={emptyAction} />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-slate-200 bg-brand-navy">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick && onRowClick(row.original)}
                className={`border-b border-slate-100 align-top transition-colors last:border-0 hover:bg-brand-50/60 ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-5 py-4 text-sm text-slate-800">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DataTable
