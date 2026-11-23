import { describe, expect, it } from 'vitest'
import { chartTable, hasChartData, reportFileName, tableToCsv } from '../chartTable'

const donut = { title: 'Gender Distribution', kind: 'donut', itemLabel: 'Sex', items: [{ label: 'Female', value: 3 }, { label: 'Male', value: 1 }] }

describe('chartTable', () => {
  it('gives a share column and a 100% total for proportional charts', () => {
    const table = chartTable(donut)
    expect(table.columns.map((c) => c.label)).toEqual(['Sex', 'Count', 'Share'])
    expect(table.rows.map((r) => r.cells)).toEqual([['Female', '3', '75.0%'], ['Male', '1', '25.0%']])
    expect(table.rows[0].swatch).toMatch(/^#/)
    expect(table.total).toEqual(['Total', '4', '100.0%'])
  })

  it('ranks bars, adding shares and a total only when they are parts of one whole', () => {
    const ranking = chartTable({ kind: 'bar', itemLabel: 'Company', unit: 'hires', items: [{ label: 'Acme', value: 1200 }, { label: 'Beta', value: 30 }] })
    expect(ranking.columns.map((c) => c.label)).toEqual(['#', 'Company', 'Hires'])
    expect(ranking.rows[0].cells).toEqual(['1', 'Acme', '1,200'])
    expect(ranking.total).toBeNull()

    const whole = chartTable({ kind: 'bar', share: true, items: [{ label: 'College', value: 1 }, { label: 'High school', value: 1 }] })
    expect(whole.rows[0].cells.at(-1)).toBe('50.0%')
    expect(whole.total).toEqual(['', 'Total', '2', '100.0%'])
  })

  it('lists every period of a trend with a total per series', () => {
    const table = chartTable({
      kind: 'line', xLabel: 'Period', formatX: (x) => `M${x}`,
      rows: [{ x: 1, a: 2, b: 5 }, { x: 2, a: 3, b: 0 }],
      series: [{ key: 'a', label: 'Hired' }, { key: 'b', label: 'Posted' }],
    })
    expect(table.columns.map((c) => c.label)).toEqual(['Period', 'Hired', 'Posted'])
    expect(table.rows.map((r) => r.cells)).toEqual([['M1', '2', '5'], ['M2', '3', '0']])
    expect(table.total).toEqual(['Total', '5', '5'])
  })
})

describe('tableToCsv', () => {
  it('puts the title and coverage on top, quotes commas, and defuses spreadsheet formulas', () => {
    const csv = tableToCsv(
      { title: 'Top companies', kind: 'bar', itemLabel: 'Company', items: [{ label: 'Smith, Jones & Co', value: 2 }, { label: '=HYPERLINK("x")', value: 1 }] },
      { coverage: ['Coverage: Nov 1 – Nov 23, 2026'] },
    )
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Top companies')
    expect(lines[1]).toBe('"Coverage: Nov 1 – Nov 23, 2026"') // has a comma, so quoted
    expect(lines[3]).toBe('#,Company,Count')
    expect(lines[4]).toBe('1,"Smith, Jones & Co",2')
    expect(lines[5]).toBe(`2,"'=HYPERLINK(""x"")",1`)
  })
})

describe('reportFileName / hasChartData', () => {
  it('slugs the title and dates the file in Philippine time', () => {
    // 4:30 PM UTC on Nov 22 is already Nov 23 in Manila.
    expect(reportFileName('Gender Distribution', 'png', new Date('2026-11-22T16:30:00Z'))).toBe('gender-distribution-2026-11-23.png')
  })

  it('knows when there is nothing to draw', () => {
    expect(hasChartData(donut)).toBe(true)
    expect(hasChartData({ kind: 'bar', items: [] })).toBe(false)
    expect(hasChartData({ kind: 'line', rows: [] })).toBe(false)
  })
})
