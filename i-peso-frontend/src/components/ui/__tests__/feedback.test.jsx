import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import EmptyState from '../EmptyState'
import ErrorState from '../ErrorState'
import LoadingSkeleton from '../LoadingSkeleton'

describe('EmptyState', () => {
  it('renders the title and description as a status region', () => {
    render(<EmptyState title="No employers yet" description="Registered employers appear here." />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('No employers yet')).toBeInTheDocument()
    expect(screen.getByText('Registered employers appear here.')).toBeInTheDocument()
  })

  it('fires the primary action', async () => {
    const onClick = vi.fn()
    render(<EmptyState title="Nothing here" action={{ label: 'Refresh', onClick }} />)

    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('supports a filtered variant for "no results for your filters"', () => {
    render(<EmptyState filtered title="No matches" description="Try clearing the filters." />)

    expect(screen.getByText('No matches')).toBeInTheDocument()
    expect(screen.getByText('Try clearing the filters.')).toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  it('is announced as an alert with a human-readable message', () => {
    render(<ErrorState description="We couldn’t reach the server." />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('We couldn’t reach the server.')).toBeInTheDocument()
  })

  it('offers a retry only when a handler is supplied', async () => {
    const onRetry = vi.fn()
    const { rerender } = render(<ErrorState description="Boom" onRetry={onRetry} />)

    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)

    rerender(<ErrorState description="Boom" />)
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull()
  })
})

describe('LoadingSkeleton', () => {
  it('exposes a polite loading status to screen readers', () => {
    render(<LoadingSkeleton variant="table" rows={3} columns={3} />)

    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('renders every supported variant without crashing', () => {
    for (const variant of ['table', 'stat', 'card', 'chart', 'text']) {
      const { unmount } = render(<LoadingSkeleton variant={variant} rows={2} />)
      expect(screen.getByRole('status')).toBeInTheDocument()
      unmount()
    }
  })
})
