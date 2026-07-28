import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../dialog'

function Harness({ onOpenChange = () => {} }) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this vacancy?</DialogTitle>
          <DialogDescription>This can’t be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button type="button">Cancel</button>
          <button type="button">Delete vacancy</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

describe('Dialog', () => {
  it('renders as an accessible dialog with a name and description', () => {
    render(<Harness />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAccessibleName('Delete this vacancy?')
    expect(dialog).toHaveAccessibleDescription('This can’t be undone.')
  })

  // This is the behaviour the hand-rolled `fixed inset-0` modals never had.
  it('closes on Escape', async () => {
    const onOpenChange = vi.fn()
    render(<Harness onOpenChange={onOpenChange} />)

    await userEvent.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('provides a labelled close control', () => {
    render(<Harness />)

    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('keeps focus inside the dialog when tabbing', async () => {
    render(<Harness />)

    const dialog = screen.getByRole('dialog')
    await userEvent.tab()
    expect(dialog).toContainElement(document.activeElement)

    await userEvent.tab()
    expect(dialog).toContainElement(document.activeElement)
  })
})
