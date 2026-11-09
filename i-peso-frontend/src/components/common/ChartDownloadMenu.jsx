import { useEffect, useId, useRef, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { CHART_EXPORT_FORMATS, EXPORT_IGNORE_ATTR, exportChart } from '@/utils/chartExport'

/**
 * Small "download" button + menu that exports the element in `targetRef`
 * as PNG, JPG, or PDF. The menu itself is excluded from the exported image.
 */
export default function ChartDownloadMenu({ targetRef, title, footnote, disabled = false }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState('')
  const rootRef = useRef(null)
  const menuId = useId()

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
      await exportChart(targetRef.current, { format, title, footnote })
    } catch (error) {
      console.error('Chart export failed', error)
      toast.error(`Unable to download chart as ${format.toUpperCase()}.`)
    } finally {
      setBusy('')
    }
  }

  return (
    <div ref={rootRef} className="relative shrink-0" {...{ [EXPORT_IGNORE_ATTR]: '' }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled || Boolean(busy)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Download ${title} chart`}
        title="Download chart"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      </button>
      {open && (
        <div id={menuId} role="menu" className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <p className="px-3 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">Download as</p>
          {CHART_EXPORT_FORMATS.map(({ format, label }) => (
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
        </div>
      )}
    </div>
  )
}
