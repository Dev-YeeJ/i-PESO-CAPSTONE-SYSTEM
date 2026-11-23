import { useEffect, useId, useRef, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import toast from '@/lib/toast'
import { hasChartData } from '@/utils/chartTable'

const FORMATS = [
  { format: 'png', label: 'PNG image' },
  { format: 'jpg', label: 'JPG image' },
  { format: 'pdf', label: 'PDF document' },
  { format: 'csv', label: 'CSV (data)' },
]

/**
 * Download button + menu for one chart. Exports `spec` (the chart's data, see
 * utils/chartTable.js) in the official template: letterhead, chart at print size,
 * the numbers behind it, notes and footer. `context` = { reportTitle, coverage, employer? }.
 */
export default function ChartDownloadMenu({ spec, context, disabled = false }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState('')
  const rootRef = useRef(null)
  const menuId = useId()
  const empty = !hasChartData(spec)

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    const onKeyDown = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const handleExport = async (format) => {
    setOpen(false)
    setBusy(format)
    try {
      const { downloadChart } = await import('@/utils/chartReportExport')
      await downloadChart(spec, context, format)
    } catch (error) {
      console.error('Chart export failed', error)
      toast.error(`Unable to download the chart as ${format.toUpperCase()}.`)
    } finally {
      setBusy('')
    }
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled || empty || Boolean(busy)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Download ${spec.title} chart`}
        title={empty ? 'No data to download for these filters' : 'Download chart'}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      </button>
      {open && (
        <div id={menuId} role="menu" className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <p className="px-3 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">Download as</p>
          {FORMATS.map(({ format, label }) => (
            <button
              key={format}
              type="button"
              role="menuitem"
              onClick={() => handleExport(format)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
            >
              <span>{label}</span>
              <span className="text-xs font-bold text-slate-400">.{format}</span>
            </button>
          ))}
          <p className="border-t border-slate-100 px-3 py-1.5 text-[11px] leading-4 text-slate-500">
            {context?.employer ? 'With your company header' : 'With PESO letterhead'}, the numbers behind the chart and the applied filters.
          </p>
        </div>
      )}
    </div>
  )
}
