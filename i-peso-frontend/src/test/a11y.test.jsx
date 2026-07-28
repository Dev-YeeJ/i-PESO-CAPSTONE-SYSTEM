import { render } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { describe, expect, it } from 'vitest'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import StatCard from '@/components/ui/StatCard'
import DataTable from '@/pages/admin/_components/DataTable'

// Automated accessibility checks on the shared primitives every redesigned
// page is built from. A violation here would propagate app-wide.
describe('accessibility (axe)', () => {
  it('StatCard has no violations, including with a trend and hint', async () => {
    const { container } = render(
      <StatCard
        label="Pending verifications"
        value="12"
        subtitle="awaiting review"
        trend={{ value: 5, label: 'vs last month' }}
        trendPositiveIsGood={false}
        hint="Employers awaiting accreditation review."
      />,
    )

    expect(await axe(container)).toHaveNoViolations()
  })

  it('EmptyState has no violations', async () => {
    const { container } = render(
      <EmptyState title="No employers yet" description="Registered employers appear here." />,
    )

    expect(await axe(container)).toHaveNoViolations()
  })

  it('ErrorState has no violations', async () => {
    const { container } = render(
      <ErrorState description="We couldn’t reach the server." onRetry={() => {}} />,
    )

    expect(await axe(container)).toHaveNoViolations()
  })

  it('LoadingSkeleton has no violations', async () => {
    const { container } = render(<LoadingSkeleton variant="table" rows={3} columns={3} />)

    expect(await axe(container)).toHaveNoViolations()
  })

  it('DataTable has no violations with real rows', async () => {
    const { container } = render(
      <DataTable
        columns={[{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }]}
        data={[{ name: 'Ana Cruz', email: 'ana@example.com' }]}
        caption="Job seekers directory."
      />,
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
