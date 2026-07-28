import { useMemo, useRef } from 'react'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
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
  virtualize = false,
}) {
  const tableRef = useRef(null)

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
  const shouldVirtualize = virtualize && rows.length > 10
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 56,
    overscan: 4,
  })

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

  const virtualRows = shouldVirtualize ? rowVirtualizer.getVirtualItems() : rows
  const totalSize = shouldVirtualize ? rowVirtualizer.getTotalSize() : undefined

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div
        ref={tableRef}
        className="overflow-x-auto"
        style={shouldVirtualize ? { maxHeight: 520, overflowY: 'auto' } : undefined}
      >
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
          <tbody style={shouldVirtualize ? { position: 'relative', height: totalSize } : undefined}>
            {virtualRows.map((row) => {
              const actualRow = shouldVirtualize ? rows[row.index] : row
              return (
                <tr
                  key={actualRow.id}
                  onClick={() => onRowClick && onRowClick(actualRow.original)}
                  className={`border-b border-slate-100 transition-colors last:border-0 hover:bg-brand-50/60 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                  style={shouldVirtualize ? { position: 'absolute', top: row.start, left: 0, width: '100%' } : undefined}
                >
                  {actualRow.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-5 py-4 text-sm text-slate-800">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DataTable
