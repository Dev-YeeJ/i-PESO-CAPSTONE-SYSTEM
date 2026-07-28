import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StatCard from '../StatCard'

describe('StatCard', () => {
  it('renders label, value and subtitle', () => {
    render(<StatCard label="Total Applications" value="1,234" subtitle="this month" />)

    expect(screen.getByText('Total Applications')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
    expect(screen.getByText('this month')).toBeInTheDocument()
  })

  it('announces trend direction to assistive tech', () => {
    render(<StatCard label="Hired" value="20" trend={{ value: 5, label: 'vs last month' }} />)

    expect(screen.getByLabelText('Hired: up 5% vs last month')).toBeInTheDocument()
  })

  it('colours a rise as good when an increase is desirable', () => {
    render(<StatCard label="Hired" value="20" trend={{ value: 5, label: 'vs last month' }} />)

    const trend = screen.getByLabelText('Hired: up 5% vs last month')
    expect(trend.querySelector('span')).toHaveClass('text-success')
  })

  // The brief's explicit anti-pattern: never show a positive green arrow when
  // the increase is undesirable (e.g. a growing verification backlog).
  it('colours a rise as bad when an increase is undesirable', () => {
    render(
      <StatCard
        label="Pending verifications"
        value="12"
        trend={{ value: 5, label: 'vs last month' }}
        trendPositiveIsGood={false}
      />,
    )

    const trend = screen.getByLabelText('Pending verifications: up 5% vs last month')
    expect(trend.querySelector('span')).toHaveClass('text-danger')
    expect(trend.querySelector('span')).not.toHaveClass('text-success')
  })

  it('colours a fall as good for a metric where less is better', () => {
    render(
      <StatCard
        label="Pending verifications"
        value="8"
        trend={{ value: -5, label: 'vs last month' }}
        trendPositiveIsGood={false}
      />,
    )

    const trend = screen.getByLabelText('Pending verifications: down 5% vs last month')
    expect(trend.querySelector('span')).toHaveClass('text-success')
  })

  it('treats a flat trend as neutral', () => {
    render(<StatCard label="Vacancies" value="7" trend={{ value: 0, label: 'vs last month' }} />)

    const trend = screen.getByLabelText('Vacancies: no change 0% vs last month')
    expect(trend.querySelector('span')).toHaveClass('text-slate-500')
  })

  it('omits the trend row entirely when no trend is supplied', () => {
    const { container } = render(<StatCard label="Vacancies" value="7" />)

    expect(container.querySelector('[aria-label*="Vacancies:"]')).toBeNull()
  })

  it('exposes the metric hint through a keyboard-focusable tooltip trigger', () => {
    render(<StatCard label="Placement rate" value="42%" hint="Hired divided by applications." />)

    const trigger = screen.getByRole('button', { name: 'How Placement rate is calculated' })
    expect(trigger).toBeInTheDocument()
    trigger.focus()
    expect(trigger).toHaveFocus()
  })
})
