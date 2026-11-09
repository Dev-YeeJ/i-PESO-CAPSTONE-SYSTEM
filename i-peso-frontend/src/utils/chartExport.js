// Client-side chart export (PNG / JPG / PDF).
// The chart's DOM node (title + Recharts SVG) is rasterised with html-to-image;
// PDFs wrap that raster in an A4 page via jsPDF. Both libraries are loaded on
// demand so they never ship in the initial analytics bundle.

export const CHART_EXPORT_FORMATS = [
  { format: 'png', label: 'PNG image' },
  { format: 'jpg', label: 'JPG image' },
  { format: 'pdf', label: 'PDF document' },
]

const PADDING = 24
const PIXEL_RATIO = 2
const BACKGROUND = '#ffffff'

// Elements marked with this attribute (e.g. the download button itself) are
// left out of the exported image.
export const EXPORT_IGNORE_ATTR = 'data-export-ignore'

export function chartFileName(title, extension, date = new Date()) {
  const slug = String(title || 'chart')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'chart'
  return `${slug}-${date.toISOString().slice(0, 10)}.${extension}`
}

function captureOptions(node) {
  const { width, height } = node.getBoundingClientRect()
  return {
    backgroundColor: BACKGROUND,
    pixelRatio: PIXEL_RATIO,
    cacheBust: true,
    width: Math.ceil(width) + PADDING * 2,
    height: Math.ceil(height) + PADDING * 2,
    style: { padding: `${PADDING}px`, boxSizing: 'border-box', margin: '0', transform: 'none' },
    filter: (element) => !(element instanceof Element && element.hasAttribute(EXPORT_IGNORE_ATTR)),
  }
}

function triggerDownload(href, filename) {
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

/**
 * Export a chart container as an image or PDF and trigger a browser download.
 * @param {HTMLElement} node   Element wrapping the chart's title and graphic.
 * @param {{ format: 'png'|'jpg'|'pdf', title: string, footnote?: string }} meta
 */
export async function exportChart(node, { format, title, footnote }) {
  if (!node) throw new Error('Chart is not ready to export.')
  const { toPng, toJpeg } = await import('html-to-image')
  const options = captureOptions(node)

  if (format === 'png') {
    triggerDownload(await toPng(node, options), chartFileName(title, 'png'))
  } else if (format === 'jpg') {
    triggerDownload(await toJpeg(node, { ...options, quality: 0.95 }), chartFileName(title, 'jpg'))
  } else if (format === 'pdf') {
    const [dataUrl, { jsPDF }] = await Promise.all([toPng(node, options), import('jspdf')])
    buildPdf(jsPDF, dataUrl, options, footnote).save(chartFileName(title, 'pdf'))
  } else {
    throw new Error(`Unsupported export format: ${format}`)
  }
}

// A4 page, orientation picked from the chart's aspect ratio; the image is
// scaled to fit inside the margins and centred horizontally.
function buildPdf(JsPDF, dataUrl, { width, height }, footnote) {
  const orientation = width >= height ? 'landscape' : 'portrait'
  const pdf = new JsPDF({ orientation, unit: 'pt', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 36
  const footerSpace = 28
  const maxWidth = pageWidth - margin * 2
  const maxHeight = pageHeight - margin * 2 - footerSpace
  const scale = Math.min(maxWidth / width, maxHeight / height)
  const drawWidth = width * scale
  const drawHeight = height * scale

  pdf.addImage(dataUrl, 'PNG', (pageWidth - drawWidth) / 2, margin, drawWidth, drawHeight, undefined, 'FAST')
  pdf.setFontSize(9)
  pdf.setTextColor(100, 116, 139)
  const generated = `Generated ${new Date().toLocaleString('en-PH')}`
  pdf.text(footnote ? `${footnote} · ${generated}` : generated, margin, pageHeight - margin)
  return pdf
}
