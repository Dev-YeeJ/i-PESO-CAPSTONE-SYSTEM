import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DataTable from '../DataTable'

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
]

const rows = [
  { name: 'Ana Cruz', email: 'ana@example.com' },
  { name: 'Ben Santos', email: 'ben@example.com' },
]

describe('DataTable', () => {
  it('shows a layout-preserving skeleton while loading', () => {
    render(<DataTable columns={columns} data={[]} loading />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows an error state with a retry when the request fails', async () => {
    const onRetry = vi.fn()
    render(<DataTable columns={columns} data={[]} error="Unable to load job seekers." onRetry={onRetry} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Unable to load job seekers.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('shows a filter-aware empty state', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        emptyTitle="No job seekers match your filters"
        emptyDescription="Try clearing or broadening the filters above."
      />,
    )

    expect(screen.getByText('No job seekers match your filters')).toBeInTheDocument()
    expect(screen.getByText('Try clearing or broadening the filters above.')).toBeInTheDocument()
  })

  it('renders rows and column headers with table semantics', () => {
    render(<DataTable columns={columns} data={rows} caption="Job seekers directory." />)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Ana Cruz')).toBeInTheDocument()
    expect(screen.getByText('ben@example.com')).toBeInTheDocument()

    // Headers must be real column headers for screen-reader table navigation.
    const headers = screen.getAllByRole('columnheader')
    expect(headers).toHaveLength(2)
    headers.forEach((header) => expect(header).toHaveAttribute('scope', 'col'))

    // sr-only caption describes the table.
    expect(screen.getByText('Job seekers directory.')).toBeInTheDocument()
  })

  it('calls onRowClick with the original row', async () => {
    const onRowClick = vi.fn()
    render(<DataTable columns={columns} data={rows} onRowClick={onRowClick} />)

    await userEvent.click(screen.getByText('Ana Cruz'))
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })
})
