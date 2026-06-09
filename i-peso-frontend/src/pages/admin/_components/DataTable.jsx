// i-peso-frontend/src/components/admin/DataTable.jsx

export function DataTable({
  columns,
  data,
  loading = false,
  onRowClick,
  emptyMessage = 'No data available',
}) {
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

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-brand-navy">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`border-b border-slate-100 transition-colors last:border-0 hover:bg-brand-50/60 ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="px-5 py-4 text-sm text-slate-800">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
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
