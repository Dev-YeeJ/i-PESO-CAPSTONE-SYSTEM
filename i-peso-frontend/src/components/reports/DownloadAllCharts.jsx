import { createElement, useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, FileArchive, FileDown, FileImage } from 'lucide-react'
import toast from '@/lib/toast'
import { Button } from '@/components/ui'
import { hasChartData } from '@/utils/chartTable'

const OPTIONS = [
  { id: 'pdf', format: 'pdf', icon: FileDown, label: 'Full report (PDF)', hint: 'Cover, contents, summary, then every chart with its numbers.' },
  { id: 'zip-png', format: 'zip', imageFormat: 'png', icon: FileArchive, label: 'All charts as PNG (ZIP)', hint: 'Each chart as an A4 PNG in the template, plus its data as CSV.' },
  { id: 'zip-jpg', format: 'zip', imageFormat: 'jpg', icon: FileImage, label: 'All charts as JPG (ZIP)', hint: 'Each chart as an A4 JPG (smaller files), plus its data as CSV.' },
]

/**
 * "Download all" for a page of charts: one PDF report or a ZIP of every chart.
 * Shows which chart is being prepared, since a full report takes a few seconds.
 */
export default function DownloadAllCharts({ specs, context, summary, appendix, disabled = false }) {
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState(null)
  const rootRef = useRef(null)
  const menuId = useId()
  const chartCount = specs.filter(hasChartData).length

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

  const run = async ({ format, imageFormat }) => {
    setOpen(false)
    setProgress({ done: 0, total: chartCount, label: 'Starting…' })
    try {
      const { downloadAllCharts } = await import('@/utils/chartReportExport')
      await downloadAllCharts({ context, specs, summary, appendix, format, imageFormat, onProgress: setProgress })
      toast.success(format === 'pdf' ? 'Full report downloaded.' : 'All charts downloaded as a ZIP file.')
    } catch (error) {
      console.error('Download all failed', error)
      toast.error('The download could not be prepared. Please try again.')
    } finally {
      setProgress(null)
    }
  }

  const busy = Boolean(progress)
  const percent = progress?.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="outline"
        icon={FileDown}
        loading={busy}
        onClick={() => setOpen((value) => !value)}
        disabled={disabled || chartCount === 0}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        {busy ? `Preparing ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…` : `Download all (${chartCount} charts)`}
        {!busy && <ChevronDown className="ml-1 h-4 w-4" aria-hidden="true" />}
      </Button>

      {busy && (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg" role="status" aria-live="polite">
          <p className="truncate text-xs font-semibold text-slate-700">{progress.label}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-navy transition-all" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">Keep this tab open until the download starts.</p>
        </div>
      )}

      {open && !busy && (
        <div id={menuId} role="menu" className="absolute right-0 top-full z-20 mt-2 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitem"
              onClick={() => run(option)}
              className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
            >
              {createElement(option.icon, { className: 'mt-0.5 h-4 w-4 shrink-0 text-brand-navy', 'aria-hidden': true })}
              <span>
                <span className="block text-sm font-semibold text-slate-800">{option.label}</span>
                <span className="block text-xs leading-5 text-slate-500">{option.hint}</span>
              </span>
            </button>
          ))}
          <p className="border-t border-slate-100 px-3 py-1.5 text-[11px] leading-4 text-slate-500">Uses the filters applied above. Charts with no data are listed but skipped.</p>
        </div>
      )}
    </div>
  )
}
