import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import PublicProgramCard from '../PublicProgramCard'
import ProgramCard from '../ProgramCard'

// Mirrors what /api/public/government-programs actually returns.
const PROGRAM = {
  program_id: 1,
  slug: 'spes-summer-batch',
  category: 'spes',
  name: 'SPES Summer Batch 2026',
  blurb: 'Wage employment for students during school breaks.',
  description: 'The Special Program for Employment of Students gives students paid work.',
  target_beneficiaries: 'Students and out-of-school youth, 15 to 30 years old.',
  eligibility_requirements: ['15 to 30 years old at the time of application'],
  required_documents: ['PSA Birth Certificate (photocopy)'],
  citizen_charter_steps: ['Visit the PESO Office and submit the requirements to the PESO staff.'],
  start_date: '2026-04-01',
  end_date: '2026-05-31',
  application_deadline: '2026-03-15',
  venue: 'PESO Office',
  location_address: 'Urdaneta City Hall',
  total_slots: 50,
  available_slots: 12,
  contact_person: 'PESO Coordinator',
  contact_email: 'peso@urdaneta.gov.ph',
  contact_phone: '09170000000',
}

describe('PublicProgramCard', () => {
  it('shows the headline facts a visitor scans for without expanding', () => {
    render(<PublicProgramCard program={PROGRAM} />)

    expect(screen.getByText('SPES Summer Batch 2026')).toBeInTheDocument()
    expect(screen.getByText(/12 of 50 slots left/)).toBeInTheDocument()
    expect(screen.getByText(/Until/)).toBeInTheDocument()
  })

  it('shows the failed eligibility reason in the seeker card', () => {
    render(<ProgramCard program={{ ...PROGRAM, title: PROGRAM.name, status: 'open', eligibility: {
      status: 'not_eligible',
      breakdown: [{ label: 'Age requirement', detail: 'Your age is outside the allowed range.', met: false, required: true }],
    }}} />)

    expect(screen.getByText('Age requirement — Your age is outside the allowed range.')).toBeInTheDocument()
  })

  it('reveals requirements, documents and PESO steps in place, with no account', async () => {
    const user = userEvent.setup()
    render(<PublicProgramCard program={PROGRAM} />)

    // Collapsed: the detail is genuinely absent, not merely hidden.
    expect(screen.queryByText(/PSA Birth Certificate/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { expanded: false }))

    expect(screen.getByText('15 to 30 years old at the time of application')).toBeInTheDocument()
    expect(screen.getByText(/PSA Birth Certificate/)).toBeInTheDocument()
    expect(screen.getByText(/Visit the PESO Office/)).toBeInTheDocument()
    expect(screen.getByText(/Urdaneta City Hall/)).toBeInTheDocument()

    // Expanding in place is the whole point — the programs pages need a
    // signed-in seeker, so a link here would dead-end a visitor at a login.
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('tells the visitor the application happens in person at PESO', async () => {
    const user = userEvent.setup()
    render(<PublicProgramCard program={PROGRAM} />)
    await user.click(screen.getByRole('button', { expanded: false }))

    // Government Programs is postings only: the card must never imply the
    // visitor can transact here.
    expect(screen.getByText(/Apply in person at the PESO office/)).toBeInTheDocument()
  })

  it('stays collapsed and inert when a posting carries no detail yet', () => {
    render(<PublicProgramCard program={{ program_id: 2, category: 'other', name: 'Bare Posting' }} />)

    expect(screen.getByText('Bare Posting')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
