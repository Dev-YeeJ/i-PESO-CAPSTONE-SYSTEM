import { useMemo, useRef } from 'react'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'

export function DataTable({
  columns,
  data,
  loading = false,
  onRowClick,
  emptyMessage = 'No data available',
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
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-8 text-center">
          <div className="inline-block">
            <div
              className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"
              style={{ animation: 'spin 0.7s linear infinite' }}
            />
          </div>
          <p className="mt-4 text-sm text-slate-600">Loading data...</p>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-8 text-center">
          <svg
            className="w-12 h-12 text-slate-400 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="mt-4 text-sm text-slate-600">{emptyMessage}</p>
        </div>
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
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-slate-200 bg-brand-navy">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
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
