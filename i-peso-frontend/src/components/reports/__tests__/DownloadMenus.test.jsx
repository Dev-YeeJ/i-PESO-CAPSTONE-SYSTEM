import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChartDownloadMenu from '@/components/common/ChartDownloadMenu'
import DownloadAllCharts from '../DownloadAllCharts'

const exportMock = vi.hoisted(() => ({ downloadChart: vi.fn(), downloadAllCharts: vi.fn() }))
vi.mock('@/utils/chartReportExport', () => exportMock)

const context = { reportTitle: 'Labor Market Analytics Report', coverage: ['Coverage: Nov 2026'] }
const gender = { id: 'gender', title: 'Gender Distribution', kind: 'donut', items: [{ label: 'Female', value: 3 }] }
const empty = { id: 'barangay', title: 'Job Seekers by Barangay', kind: 'bar', items: [] }

describe('chart download menus', () => {
  beforeEach(() => {
    exportMock.downloadChart.mockReset().mockResolvedValue()
    exportMock.downloadAllCharts.mockReset()
  })

  it('downloads one chart in the chosen format, including the data as CSV', async () => {
    const user = userEvent.setup()
    render(<ChartDownloadMenu spec={gender} context={context} />)

    await user.click(screen.getByRole('button', { name: 'Download Gender Distribution chart' }))
    expect(screen.getByText('With PESO letterhead', { exact: false })).toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: /CSV \(data\)/ }))

    await waitFor(() => expect(exportMock.downloadChart).toHaveBeenCalledWith(gender, context, 'csv'))
  })

  it('cannot download a chart with no data', () => {
    render(<ChartDownloadMenu spec={empty} context={context} />)
    expect(screen.getByRole('button', { name: 'Download Job Seekers by Barangay chart' })).toBeDisabled()
  })

  it('downloads every chart as one report, showing which chart is being prepared', async () => {
    let finish
    exportMock.downloadAllCharts.mockImplementation(({ onProgress }) => new Promise((resolve) => {
      onProgress({ done: 0, total: 1, label: 'Gender Distribution' })
      finish = resolve
    }))
    const user = userEvent.setup()
    render(<DownloadAllCharts specs={[gender, empty]} context={context} summary={{ rows: [] }} />)

    await user.click(screen.getByRole('button', { name: /Download all \(1 charts\)/ }))
    await user.click(screen.getByRole('menuitem', { name: /Full report \(PDF\)/ }))

    expect(await screen.findByRole('status')).toHaveTextContent('Gender Distribution')
    expect(screen.getByRole('button', { name: /Preparing 1 of 1/ })).toBeDisabled()
    expect(exportMock.downloadAllCharts).toHaveBeenCalledWith(expect.objectContaining({ format: 'pdf', specs: [gender, empty], context }))

    finish()
    await waitFor(() => expect(screen.getByRole('button', { name: /Download all/ })).toBeEnabled())
  })
})
