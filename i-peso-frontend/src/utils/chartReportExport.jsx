// Chart downloads in the official PESO template.
//
// PNG / JPG: <ReportFrame> (letterhead, chart, table, notes) is drawn off screen at a
// fixed print size and captured with html-to-image, so it looks the same from any screen.
// PDF: jsPDF draws the same layout with real text (sharp when printed); only the chart
// itself is an image. "Download all" builds one PDF (cover, contents, summary, a page
// per chart) or a ZIP of the chart images plus their data as CSV.
// html-to-image, jsPDF and JSZip are loaded only when a download starts.
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import pesoSealUrl from '@/assets/images/peso-urdaneta-seal.jpg'
import citySealUrl from '@/assets/images/urdaneta-city-seal.jpg'
import { ChartOnly } from '@/components/reports/ExportChart'
import ReportFrame from '@/components/reports/ReportFrame'
import { chartTable, hasChartData, reportFileName, tableToCsv } from '@/utils/chartTable'

const SOURCE = 'Source: i-PESO Urdaneta City (ipeso.website)'
const NAVY = [18, 53, 99]
const SLATE = [71, 85, 105]
const BORDER = [203, 213, 225]

// ── Single chart ─────────────────────────────────────────────────────────────

/** Download one chart as png | jpg | pdf | csv in the template. */
export async function downloadChart(spec, context, format) {
  const ctx = withDefaults(context)
  if (format === 'csv') {
    return saveBlob(new Blob(['\uFEFF', tableToCsv(spec, ctx)], { type: 'text/csv;charset=utf-8' }), reportFileName(spec.title, 'csv', ctx.generatedAt))
  }
  if (format === 'png' || format === 'jpg') {
    const { dataUrl } = await renderToImage(<ReportFrame spec={spec} context={ctx} />, format)
    return saveDataUrl(dataUrl, reportFileName(spec.title, format, ctx.generatedAt))
  }
  if (format === 'pdf') {
    const report = await PdfReport.create(ctx)
    await report.addChartPage(spec, { fullLetterhead: true })
    return report.save(reportFileName(spec.title, 'pdf', ctx.generatedAt))
  }
  throw new Error(`Unsupported format: ${format}`)
}

// ── Download all ─────────────────────────────────────────────────────────────

/**
 * One file with every chart on the page.
 * @param {object}   options.context   { reportTitle, coverage, employer?, generatedAt? }
 * @param {object[]} options.specs     chart specs, in page order (empty ones are listed as "no data")
 * @param {object}   [options.summary] { title, rows: [[label, value, detail]] , notes: string[] }
 * @param {object[]} [options.appendix] extra tables: [{ title, columns: [label], rows: [[...]], notes }]
 * @param {'pdf'|'zip'} options.format
 * @param {(p: { done: number, total: number, label: string }) => void} [options.onProgress]
 */
export async function downloadAllCharts({ context, specs, summary, appendix = [], format, onProgress = () => {} }) {
  const ctx = withDefaults(context)
  const drawable = specs.filter(hasChartData)
  const total = drawable.length
  const baseName = reportFileName(ctx.reportTitle, format === 'zip' ? 'zip' : 'pdf', ctx.generatedAt)

  if (format === 'zip') {
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    for (const [index, spec] of drawable.entries()) {
      onProgress({ done: index, total, label: spec.title })
      const prefix = String(index + 1).padStart(2, '0')
      const { dataUrl } = await renderToImage(<ReportFrame spec={spec} context={ctx} />, 'png')
      zip.file(`${prefix}-${reportFileName(spec.title, 'png', ctx.generatedAt)}`, dataUrl.split(',')[1], { base64: true })
      zip.file(`data/${prefix}-${reportFileName(spec.title, 'csv', ctx.generatedAt)}`, `\uFEFF${tableToCsv(spec, ctx)}`)
    }
    if (summary?.rows?.length) {
      zip.file(`data/00-${reportFileName(summary.title ?? 'summary', 'csv', ctx.generatedAt)}`, `\uFEFF${summaryCsv(summary, ctx)}`)
    }
    onProgress({ done: total, total, label: 'Packing the ZIP file' })
    return saveBlob(await zip.generateAsync({ type: 'blob' }), baseName)
  }

  const report = await PdfReport.create(ctx)
  report.reservePage() // cover + contents, filled in last (needs the page numbers)
  const contents = []
  if (summary?.rows?.length) {
    contents.push({ title: summary.title ?? 'Summary', page: report.addSummaryPage(summary) })
  }
  let currentSection = null
  for (const [index, spec] of specs.entries()) {
    if (spec.section && spec.section !== currentSection) {
      currentSection = spec.section
      contents.push({ heading: spec.section })
    }
    if (!hasChartData(spec)) {
      contents.push({ title: spec.title, page: null })
      continue
    }
    onProgress({ done: drawable.indexOf(spec), total, label: spec.title })
    contents.push({ title: spec.title, page: await report.addChartPage(spec, { index }) })
  }
  for (const table of appendix) {
    contents.push({ title: table.title, page: report.addTablePage(table) })
  }
  report.drawCover(contents)
  onProgress({ done: total, total, label: 'Saving the PDF' })
  return report.save(baseName)
}

// ── PDF layout ───────────────────────────────────────────────────────────────

class PdfReport {
  static async create(context) {
    const [{ jsPDF }, citySeal, pesoSeal] = await Promise.all([import('jspdf'), toDataUrl(citySealUrl), toDataUrl(pesoSealUrl)])
    return new PdfReport(new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' }), context, { citySeal, pesoSeal })
  }

  constructor(pdf, context, seals) {
    this.pdf = pdf
    this.context = context
    this.seals = seals
    this.margin = 40
    this.width = pdf.internal.pageSize.getWidth()
    this.height = pdf.internal.pageSize.getHeight()
    this.contentWidth = this.width - this.margin * 2
    this.bottom = this.height - 54 // footer zone below
    this.started = false
  }

  newPage() {
    if (this.started) this.pdf.addPage()
    this.started = true
    return this.pdf.getNumberOfPages()
  }

  reservePage() {
    this.coverPage = this.newPage()
  }

  /** Full letterhead (seals + office lines + report title); returns the y below it. */
  letterhead(y = this.margin) {
    const { pdf, margin, width } = this
    if (this.context.employer) {
      pdf.setFont('helvetica', 'bold').setFontSize(14).setTextColor(...NAVY)
      pdf.text(this.context.employer, margin, y + 14)
      pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...SLATE)
      pdf.text(`${this.context.reportTitle} · i-PESO Urdaneta City Employer Portal`, margin, y + 30)
      return this.rule(y + 40)
    }
    pdf.addImage(this.seals.citySeal, 'JPEG', margin, y, 54, 54)
    pdf.addImage(this.seals.pesoSeal, 'JPEG', width - margin - 54, y, 54, 54)
    pdf.setTextColor(15, 23, 42).setFont('helvetica', 'normal').setFontSize(9)
    pdf.text('Republic of the Philippines', width / 2, y + 10, { align: 'center' })
    pdf.text('City of Urdaneta, Pangasinan', width / 2, y + 21, { align: 'center' })
    pdf.setFont('helvetica', 'bold').setFontSize(11.5).setTextColor(...NAVY)
    pdf.text('PUBLIC EMPLOYMENT SERVICE OFFICE', width / 2, y + 35, { align: 'center' })
    pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...SLATE)
    pdf.text(this.context.reportTitle, width / 2, y + 48, { align: 'center' })
    return this.rule(y + 62)
  }

  /** Small running header for the pages after the first. */
  compactHeader() {
    const { pdf, margin, width } = this
    if (!this.context.employer) {
      pdf.addImage(this.seals.citySeal, 'JPEG', margin, margin - 6, 24, 24)
      pdf.addImage(this.seals.pesoSeal, 'JPEG', width - margin - 24, margin - 6, 24, 24)
    }
    pdf.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...NAVY)
    pdf.text(this.context.employer ?? 'PUBLIC EMPLOYMENT SERVICE OFFICE · Urdaneta City', width / 2, margin + 4, { align: 'center' })
    pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...SLATE)
    pdf.text(this.context.reportTitle, width / 2, margin + 14, { align: 'center' })
    return this.rule(margin + 24)
  }

  rule(y) {
    this.pdf.setDrawColor(...NAVY).setLineWidth(1.2).line(this.margin, y, this.width - this.margin, y)
    return y + 16
  }

  heading(y, { section, title, subtitle }) {
    const { pdf, margin, contentWidth } = this
    if (section) {
      pdf.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...SLATE)
      pdf.text(section.toUpperCase(), margin, y)
      y += 13
    }
    pdf.setFont('helvetica', 'bold').setFontSize(15).setTextColor(15, 23, 42)
    for (const line of pdf.splitTextToSize(title, contentWidth)) { pdf.text(line, margin, y + 4); y += 18 }
    if (subtitle) {
      pdf.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...SLATE)
      for (const line of pdf.splitTextToSize(subtitle, contentWidth)) { pdf.text(line, margin, y); y += 12 }
    }
    if (this.context.coverage?.length) {
      pdf.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...NAVY)
      for (const line of pdf.splitTextToSize(this.context.coverage.join('  ·  '), contentWidth)) { pdf.text(line, margin, y + 2); y += 12 }
    }
    return y + 8
  }

  async addChartPage(spec, { fullLetterhead = false } = {}) {
    const page = this.newPage()
    let y = fullLetterhead ? this.letterhead() : this.compactHeader()
    y = this.heading(y, spec)

    const { dataUrl, width, height } = await renderToImage(<ChartOnly spec={spec} />, 'png')
    const drawWidth = this.contentWidth
    const drawHeight = Math.min(height * (drawWidth / width), 300)
    const scaledWidth = width * (drawHeight / height)
    this.pdf.setDrawColor(...BORDER).setLineWidth(0.6).roundedRect(this.margin, y, this.contentWidth, drawHeight + 16, 6, 6)
    this.pdf.addImage(dataUrl, 'PNG', this.margin + (this.contentWidth - scaledWidth) / 2, y + 8, scaledWidth, drawHeight, undefined, 'FAST')
    y += drawHeight + 30

    const table = chartTable(spec)
    y = this.table(y, table.columns, table.rows, table.total)
    y = this.notes(y, spec.notes)
    return page
  }

  addSummaryPage(summary) {
    const page = this.newPage()
    let y = this.compactHeader()
    y = this.heading(y, { title: summary.title ?? 'Summary', subtitle: summary.subtitle })
    y = this.table(y, [{ label: 'Indicator', align: 'left' }, { label: 'Value', align: 'right' }, { label: 'Details', align: 'left' }],
      summary.rows.map((cells) => ({ cells: cells.map((cell) => String(cell ?? '')) })), null, [0.42, 0.16, 0.42])
    this.notes(y, summary.notes)
    return page
  }

  addTablePage({ title, subtitle, columns, rows, notes }) {
    const page = this.newPage()
    let y = this.compactHeader()
    y = this.heading(y, { title, subtitle })
    y = this.table(y, columns.map((label, index) => ({ label, align: index === 0 ? 'left' : 'right' })), rows.map((cells) => ({ cells: cells.map(String) })), null)
    this.notes(y, notes)
    return page
  }

  /** A bordered table that continues on the next page when it runs out of room. */
  table(y, columns, rows, total, fractions) {
    const { pdf, margin, contentWidth } = this
    const rowHeight = 16
    const widths = fractions
      ? fractions.map((fraction) => fraction * contentWidth)
      : columnWidths(columns, contentWidth)
    const drawRow = (cells, { header = false, bold = false, swatch = null } = {}) => {
      if (y + rowHeight > this.bottom) {
        this.newPage()
        y = this.compactHeader()
        if (!header) drawRow(columns.map((column) => column.label), { header: true })
      }
      let x = margin
      if (header || bold) pdf.setFillColor(header ? 241 : 248, header ? 245 : 250, header ? 249 : 252).rect(margin, y, contentWidth, rowHeight, 'F')
      pdf.setDrawColor(...BORDER).setLineWidth(0.5)
      pdf.setFont('helvetica', header || bold ? 'bold' : 'normal').setFontSize(8.5).setTextColor(15, 23, 42)
      cells.forEach((cell, index) => {
        const w = widths[index]
        pdf.rect(x, y, w, rowHeight)
        const right = columns[index]?.align === 'right'
        let textX = right ? x + w - 5 : x + 5
        if (index === 0 && swatch) {
          pdf.setFillColor(swatch).rect(x + 5, y + 5, 6, 6, 'F')
          textX += 10
        }
        const room = w - 10 - (index === 0 && swatch ? 10 : 0)
        pdf.text(fit(pdf, String(cell ?? ''), room), textX, y + 11, { align: right ? 'right' : 'left' })
        x += w
      })
      y += rowHeight
    }
    drawRow(columns.map((column) => column.label), { header: true })
    rows.forEach((row) => drawRow(row.cells, { swatch: row.swatch }))
    if (total) drawRow(total, { bold: true })
    return y + 10
  }

  notes(y, notes = []) {
    const { pdf, margin, contentWidth } = this
    pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...SLATE)
    for (const note of notes.filter(Boolean)) {
      for (const line of pdf.splitTextToSize(`Note: ${note}`, contentWidth)) {
        if (y + 11 > this.bottom) { this.newPage(); y = this.compactHeader() }
        pdf.text(line, margin, y)
        y += 11
      }
      y += 3
    }
    return y
  }

  drawCover(contents) {
    const { pdf, margin, width, contentWidth } = this
    pdf.setPage(this.coverPage)
    let y = this.letterhead()
    y += 30
    pdf.setFont('helvetica', 'bold').setFontSize(22).setTextColor(15, 23, 42)
    for (const line of pdf.splitTextToSize(this.context.reportTitle, contentWidth)) { pdf.text(line, width / 2, y, { align: 'center' }); y += 26 }
    pdf.setFont('helvetica', 'normal').setFontSize(10.5).setTextColor(...NAVY)
    for (const line of this.context.coverage ?? []) { pdf.text(line, width / 2, y, { align: 'center' }); y += 15 }
    pdf.setTextColor(...SLATE).setFontSize(9.5)
    pdf.text(`Generated ${formatStamp(this.context.generatedAt)}`, width / 2, y + 4, { align: 'center' })
    y += 40

    pdf.setFont('helvetica', 'bold').setFontSize(12).setTextColor(15, 23, 42)
    pdf.text('Contents', margin, y)
    y = this.rule(y + 6) - 4
    for (const entry of contents) {
      if (y > this.bottom - 12) break
      if (entry.heading) {
        y += 4
        pdf.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...NAVY)
        pdf.text(entry.heading, margin, y)
        y += 13
        continue
      }
      pdf.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(entry.page ? 15 : 148, entry.page ? 23 : 163, entry.page ? 42 : 184)
      pdf.text(fit(pdf, entry.title, contentWidth - 120), margin + 10, y)
      pdf.text(entry.page ? `page ${entry.page}` : 'no data for these filters', width - margin, y, { align: 'right' })
      y += 13
    }
  }

  /** Footer on every page: source, generated time, page x of y. */
  save(filename) {
    const { pdf, margin, width, height } = this
    const pages = pdf.getNumberOfPages()
    for (let page = 1; page <= pages; page += 1) {
      pdf.setPage(page)
      pdf.setDrawColor(...BORDER).setLineWidth(0.5).line(margin, height - 40, width - margin, height - 40)
      pdf.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...SLATE)
      pdf.text(SOURCE, margin, height - 28)
      pdf.text(`Generated ${formatStamp(this.context.generatedAt)}  ·  Page ${page} of ${pages}`, width - margin, height - 28, { align: 'right' })
    }
    pdf.save(filename)
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function withDefaults(context = {}) {
  return { reportTitle: 'i-PESO Report', coverage: [], ...context, generatedAt: context.generatedAt ?? new Date() }
}

/** Draws `element` off screen, waits for it (and its images) to settle, captures it. */
async function renderToImage(element, format = 'png') {
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = 'position:fixed;left:-30000px;top:0;pointer-events:none;'
  document.body.appendChild(host)
  const root = createRoot(host)
  try {
    flushSync(() => root.render(element))
    await Promise.all([...host.querySelectorAll('img')].map(waitForImage))
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const node = host.firstElementChild
    const { toPng, toJpeg } = await import('html-to-image')
    const options = { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true }
    const dataUrl = format === 'jpg' ? await toJpeg(node, { ...options, quality: 0.95 }) : await toPng(node, options)
    return { dataUrl, width: node.offsetWidth, height: node.offsetHeight }
  } finally {
    root.unmount()
    host.remove()
  }
}

/** Resolves once the image has loaded (or failed), so the seals are in the capture. */
function waitForImage(img) {
  if (img.complete) return null // loaded (or failed): nothing to wait for
  if (typeof img.decode === 'function') return img.decode().catch(() => null)
  return new Promise((resolve) => {
    img.addEventListener('load', resolve, { once: true })
    img.addEventListener('error', resolve, { once: true })
    setTimeout(resolve, 3000)
  })
}

async function toDataUrl(url) {
  const blob = await (await fetch(url)).blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function columnWidths(columns, total) {
  // Number columns get a fixed width; text columns share what's left.
  const fixed = columns.map((column, index) => (column.label === '#' ? 28 : column.align === 'right' && index > 0 ? 78 : 0))
  const flexible = columns.filter((_, index) => fixed[index] === 0).length || 1
  const remaining = total - fixed.reduce((sum, width) => sum + width, 0)
  return fixed.map((width) => width || remaining / flexible)
}

/** Shortens text with "…" until it fits `room` points at the current font. */
function fit(pdf, text, room) {
  if (pdf.getTextWidth(text) <= room) return text
  let cut = text
  while (cut.length > 1 && pdf.getTextWidth(`${cut}…`) > room) cut = cut.slice(0, -1)
  return `${cut}…`
}

const formatStamp = (date) => date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

function summaryCsv(summary, context) {
  const cell = (value) => {
    const text = String(value ?? '')
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
  }
  return [
    [summary.title ?? 'Summary'], ...(context.coverage ?? []).map((line) => [line]), [],
    ['Indicator', 'Value', 'Details'], ...summary.rows,
  ].map((cells) => cells.map(cell).join(',')).join('\r\n')
}

function saveDataUrl(href, filename) {
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  saveDataUrl(url, filename)
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
