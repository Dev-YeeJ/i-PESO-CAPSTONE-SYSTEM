import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import ApplicantNameSuggest from '../ApplicantNameSuggest'

const MATCH = {
  seeker_id: 7,
  name: 'Jaime Reyes',
  first_name: 'Jaime',
  last_name: 'Reyes',
  city_municipality: 'Urdaneta City',
  contact_number: '09170000001',
}

/**
 * Mirrors how every caller mounts this: inside the `overflow-x-auto` wrapper
 * the report tables use. That container is the reason the list is portalled —
 * a non-visible overflow on one axis clips the other too.
 */
function Harness({ searchFn, onSelect = () => {} }) {
  const [value, setValue] = useState('')
  return (
    <div data-testid="scroller" className="overflow-x-auto">
      <ApplicantNameSuggest
        value={value}
        onChangeText={setValue}
        onSelect={onSelect}
        searchFn={searchFn}
        placeholder="First name"
      />
    </div>
  )
}

describe('ApplicantNameSuggest', () => {
  it('renders the list outside the scrolling table so it cannot be clipped', async () => {
    const user = userEvent.setup()
    render(<Harness searchFn={vi.fn().mockResolvedValue([MATCH])} />)

    await user.type(screen.getByPlaceholderText('First name'), 'Jaime')

    const option = await screen.findByText('Jaime Reyes')
    const scroller = screen.getByTestId('scroller')

    // The whole point of the portal: the option must not live inside the
    // overflow container, or it renders invisibly below the row.
    expect(scroller.contains(option)).toBe(false)
    expect(document.body.contains(option)).toBe(true)
  })

  it('selects a suggestion even though the list sits outside the input', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Harness searchFn={vi.fn().mockResolvedValue([MATCH])} onSelect={onSelect} />)

    await user.type(screen.getByPlaceholderText('First name'), 'Jaime')
    await user.click(await screen.findByText('Jaime Reyes'))

    // A portalled list is not a DOM descendant of the input, so the
    // outside-click handler has to exclude it explicitly — otherwise the
    // list closes on mousedown and the click never lands.
    expect(onSelect).toHaveBeenCalledWith(MATCH)
  })

  it('says so when nothing matches instead of showing an empty box', async () => {
    const user = userEvent.setup()
    render(<Harness searchFn={vi.fn().mockResolvedValue([])} />)

    await user.type(screen.getByPlaceholderText('First name'), 'Zzzz')

    expect(await screen.findByText(/No matching job seeker/i)).toBeInTheDocument()
  })

  it('does not search on a single character', async () => {
    const user = userEvent.setup()
    const searchFn = vi.fn().mockResolvedValue([MATCH])
    render(<Harness searchFn={searchFn} />)

    await user.type(screen.getByPlaceholderText('First name'), 'J')

    await waitFor(() => expect(searchFn).not.toHaveBeenCalled())
    expect(screen.queryByText('Jaime Reyes')).not.toBeInTheDocument()
  })
})
