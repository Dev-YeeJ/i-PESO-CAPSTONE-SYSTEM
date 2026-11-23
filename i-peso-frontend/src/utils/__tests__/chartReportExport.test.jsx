import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Image capture can't run in jsdom: return a tiny PNG instead.
vi.mock('html-to-image', () => ({
  toPng: vi.fn(async () => 'data:image/png;base64,AAAA'),
  toJpeg: vi.fn(async () => 'data:image/jpeg;base64,AAAA'),
}))

// A jsPDF stand-in that records what is drawn, page by page.
const pdfs = []
vi.mock('jspdf', () => ({
  jsPDF: class FakePdf {
    constructor() {
      this.pages = [[]]
      this.current = 0
      this.saved = null
      this.internal = { pageSize: { getWidth: () => 595, getHeight: () => 842 } }
      pdfs.push(this)
      for (const name of ['setFont', 'setFontSize', 'setTextColor', 'setDrawColor', 'setFillColor', 'setLineWidth', 'line', 'rect', 'roundedRect']) {
        this[name] = () => this
      }
    }
    addPage() { this.pages.push([]); this.current = this.pages.length - 1; return this }
    setPage(page) { this.current = page - 1; return this }
    getNumberOfPages() { return this.pages.length }
    text(text) { this.pages[this.current].push(String(text)); return this }
    addImage() { this.pages[this.current].push('[image]'); return this }
    getTextWidth(text) { return String(text).length * 4 }
    splitTextToSize(text) { return [String(text)] }
    save(name) { this.saved = name }
  },
}))

const zips = []
vi.mock('jszip', () => ({
  default: class FakeZip {
    constructor() { this.files = {}; zips.push(this) }
    file(name, content) { this.files[name] = content }
    async generateAsync() { return new Blob(['zip']) }
  },
}))

const { downloadAllCharts, downloadChart } = await import('../chartReportExport')

const context = { reportTitle: 'Labor Market Analytics Report', coverage: ['Coverage: Nov 1, 2026 – Nov 23, 2026'], generatedAt: new Date('2026-11-23T02:00:00Z') }
const gender = { id: 'gender', section: 'Trends', title: 'Gender Distribution', kind: 'donut', items: [{ label: 'Female', value: 3 }, { label: 'Male', value: 1 }], notes: ['Seekers with sex data.'] }
const skills = { id: 'skills', section: 'Skills', title: 'Common Job Seeker Skills', kind: 'bar', items: [{ label: 'Welding', value: 9 }] }
const empty = { id: 'barangay', section: 'Skills', title: 'Job Seekers by Barangay', kind: 'bar', items: [] }

describe('chart report export', () => {
  let clicked
  beforeEach(() => {
    pdfs.length = 0
    zips.length = 0
    clicked = []
    globalThis.fetch = vi.fn(async () => ({ blob: async () => new Blob(['seal'], { type: 'image/jpeg' }) }))
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() { clicked.push(this.download) })
    // jsdom never loads images; in a browser the seals finish loading almost at once.
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true)
  })
  afterEach(() => vi.restoreAllMocks())

  it('draws one chart on a page with the letterhead, coverage, numbers, notes and page footer', async () => {
    await downloadChart(gender, context, 'pdf')

    const [pdf] = pdfs
    const page = pdf.pages[0].join(' | ')
    expect(pdf.saved).toBe('gender-distribution-2026-11-23.pdf')
    expect(page).toContain('PUBLIC EMPLOYMENT SERVICE OFFICE')
    expect(page).toContain('Republic of the Philippines')
    expect(page).toContain('Gender Distribution')
    expect(page).toContain('Coverage: Nov 1, 2026 – Nov 23, 2026')
    expect(pdf.pages[0]).toEqual(expect.arrayContaining(['Female', '3', '75.0%', 'Total', '100.0%']))
    expect(page).toContain('Note: Seekers with sex data.')
    expect(page).toContain('Page 1 of 1')
  })

  it('builds one report: cover with contents, a summary page, then a page per chart with data', async () => {
    const progress = []
    await downloadAllCharts({
      context, format: 'pdf', specs: [gender, skills, empty],
      summary: { title: 'Summary of indicators', rows: [['Total registered applicants', '1,200', 'all']] },
      appendix: [{ title: 'Experimental forecast', columns: ['Category', 'Predicted'], rows: [['Welding', '4']] }],
      onProgress: (p) => progress.push(p),
    })

    const [pdf] = pdfs
    expect(pdf.saved).toBe('labor-market-analytics-report-2026-11-23.pdf')
    expect(pdf.pages).toHaveLength(5) // cover, summary, gender, skills, forecast
    const cover = pdf.pages[0]
    expect(cover).toEqual(expect.arrayContaining(['Contents', 'Summary of indicators', 'page 2', 'Gender Distribution', 'page 3', 'Common Job Seeker Skills', 'page 4', 'Experimental forecast', 'page 5']))
    expect(cover).toContain('Job Seekers by Barangay')
    expect(cover).toContain('no data for these filters')
    expect(pdf.pages[1]).toContain('Total registered applicants')
    expect(pdf.pages[3]).toContain('Welding')
    expect(pdf.pages[4].join(' ')).toContain('Page 5 of 5')
    expect(progress.at(-1)).toEqual({ done: 2, total: 2, label: 'Saving the PDF' })
  })

  it('zips each chart as a template image with its data as CSV', async () => {
    await downloadAllCharts({ context, format: 'zip', specs: [gender, empty, skills], summary: { title: 'Summary', rows: [['A', '1', '']] } })

    const [zip] = zips
    expect(Object.keys(zip.files).sort()).toEqual([
      '01-gender-distribution-2026-11-23.png',
      '02-common-job-seeker-skills-2026-11-23.png',
      'data/00-summary-2026-11-23.csv',
      'data/01-gender-distribution-2026-11-23.csv',
      'data/02-common-job-seeker-skills-2026-11-23.csv',
    ])
    expect(zip.files['data/01-gender-distribution-2026-11-23.csv']).toContain('Female,3,75.0%')
    expect(clicked).toEqual(['labor-market-analytics-report-2026-11-23.zip'])
  })

  it('saves the numbers alone as CSV', async () => {
    await downloadChart(skills, context, 'csv')
    expect(clicked).toEqual(['common-job-seeker-skills-2026-11-23.csv'])
  })
})
