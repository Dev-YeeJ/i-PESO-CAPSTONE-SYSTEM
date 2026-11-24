import { useLayoutEffect, useRef } from 'react'
import pesoSeal from '@/assets/images/peso-urdaneta-seal.jpg'
import citySeal from '@/assets/images/urdaneta-city-seal.jpg'
import IPesoLogo from '@/components/branding/IPesoLogo'
import { chartTable } from '@/utils/chartTable'
import ExportChart from './ExportChart'

// The image is an A4 portrait page, the same shape as the PDF (595 × 842 pt), so a
// PNG / JPG and a PDF page of the same chart print at the same size.
export const FRAME_WIDTH = 1000
const FRAME_HEIGHT = Math.round(FRAME_WIDTH * (842 / 595)) // 1415
const PAGE_MARGIN = Math.round(FRAME_WIDTH * (40 / 595)) // the PDF's 40 pt margin → 67 px

/**
 * The downloadable chart page (PNG / JPG): letterhead, title and coverage, the chart
 * drawn at print size, the numbers behind it, notes, and a footer. PDFs draw the same
 * layout with jsPDF (chartReportExport.jsx) so their text stays sharp.
 *
 * The page is always A4. If a long table would run past the footer, the body is scaled
 * down to fit the page instead of making the image taller.
 *
 * context: { reportTitle, coverage: string[], employer?: string, generatedAt: Date }
 */
export default function ReportFrame({ spec, context }) {
  const table = chartTable(spec)
  const bodyRef = useRef(null)
  const contentRef = useRef(null)
  // Measured before the capture (the page is drawn off screen, never shown), so the
  // scale is written straight onto the node instead of re-rendering.
  useLayoutEffect(() => {
    const content = contentRef.current
    const room = bodyRef.current?.clientHeight ?? 0
    const needed = content?.scrollHeight ?? 0
    if (room > 0 && needed > room) {
      const scale = room / needed
      Object.assign(content.style, { transform: `scale(${scale})`, transformOrigin: 'top left', width: `${100 / scale}%` })
    }
  }, [])

  return (
    <div
      style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT, padding: PAGE_MARGIN, fontFamily: 'Inter, Arial, sans-serif' }}
      className="flex flex-col overflow-hidden bg-white text-slate-900"
    >
      <div ref={bodyRef} className="min-h-0 flex-1 overflow-hidden">
        <div ref={contentRef}>
          <Letterhead context={context} />

          <div className="mt-6">
            {spec.section && <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{spec.section}</p>}
            <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-950">{spec.title}</h1>
            {spec.subtitle && <p className="mt-1 text-sm text-slate-600">{spec.subtitle}</p>}
            {context.coverage?.length > 0 && (
              <p className="mt-2 text-sm font-semibold text-brand-navy">{context.coverage.join('  ·  ')}</p>
            )}
          </div>

          <div className="mt-5 flex justify-center rounded-xl border border-slate-200 p-3">
            <ExportChart spec={spec} width={FRAME_WIDTH - PAGE_MARGIN * 2 - 30} height={420} />
          </div>

          <table className="mt-5 w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                {table.columns.map((column) => (
                  <th key={column.label} className={`border border-slate-300 px-3 py-1.5 font-semibold ${column.align === 'right' ? 'text-right' : 'text-left'}`}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.cells.map((cell, cellIndex) => (
                    <td key={cellIndex} className={`border border-slate-300 px-3 py-1 ${table.columns[cellIndex]?.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                      {cellIndex === 0 && row.swatch && <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ backgroundColor: row.swatch }} />}
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
              {table.total && (
                <tr className="bg-slate-50 font-bold">
                  {table.total.map((cell, cellIndex) => (
                    <td key={cellIndex} className={`border border-slate-300 px-3 py-1 ${table.columns[cellIndex]?.align === 'right' ? 'text-right tabular-nums' : ''}`}>{cell}</td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>

          {spec.notes?.filter(Boolean).length > 0 && (
            <div className="mt-4 space-y-1 text-xs leading-5 text-slate-600">
              {spec.notes.filter(Boolean).map((note) => <p key={note}><span className="font-semibold">Note:</span> {note}</p>)}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex shrink-0 justify-between border-t border-slate-200 pt-3 text-xs text-slate-500">
        <span>Source: i-PESO Urdaneta City (ipeso.website)</span>
        <span>Generated {context.generatedAt.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</span>
      </div>
    </div>
  )
}

function Letterhead({ context }) {
  if (context.employer) {
    return (
      <div className="flex items-center gap-4 border-b-2 border-brand-navy pb-4">
        <IPesoLogo className="h-12 w-12" />
        <div>
          <p className="text-lg font-bold text-brand-navy">{context.employer}</p>
          <p className="text-sm text-slate-600">{context.reportTitle} · i-PESO Urdaneta City Employer Portal</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b-2 border-brand-navy pb-4">
      <img src={citySeal} alt="" className="h-20 w-20 object-contain" />
      <div className="text-center leading-snug">
        <p className="text-sm">Republic of the Philippines</p>
        <p className="text-sm">City of Urdaneta, Pangasinan</p>
        <p className="text-base font-bold tracking-wide text-brand-navy">PUBLIC EMPLOYMENT SERVICE OFFICE</p>
        <p className="mt-1 text-sm font-semibold text-slate-700">{context.reportTitle}</p>
      </div>
      <img src={pesoSeal} alt="" className="h-20 w-20 object-contain" />
    </div>
  )
}
