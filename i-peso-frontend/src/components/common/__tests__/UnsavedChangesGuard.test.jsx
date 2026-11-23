import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, Outlet, RouterProvider, createMemoryRouter, useSearchParams } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import UnsavedChangesBar from '../UnsavedChangesBar'
import UnsavedChangesGuard from '../UnsavedChangesGuard'
import { clearUnsavedChanges, useUnsavedChanges, useUnsavedEntries } from '@/hooks/useUnsavedChanges'

function Editor() {
  const [value, setValue] = useState('')
  useUnsavedChanges('content:about', value ? 1 : 0, 'About PESO')
  return (
    <div>
      <label>Headline <input value={value} onChange={(event) => setValue(event.target.value)} /></label>
      <UnsavedChangesBar count={value ? 1 : 0}><button type="button">Save</button></UnsavedChangesBar>
    </div>
  )
}

function ContentPage() {
  const [params, setParams] = useSearchParams()
  const unsaved = new Set(useUnsavedEntries().map((entry) => entry.id))
  return (
    <div>
      <button type="button" onClick={() => setParams({ tab: 'office' })}>Office info tab</button>
      {unsaved.has('content:about') && <span>About has unsaved changes</span>}
      <p>Tab: {params.get('tab') ?? 'about'}</p>
      {(params.get('tab') ?? 'about') === 'about' && <Editor />}
      <Link to="/admin/settings">Go to settings</Link>
    </div>
  )
}

function renderAdmin() {
  const router = createMemoryRouter([{
    element: <><Outlet /><UnsavedChangesGuard /></>,
    children: [
      { path: '/admin/content-modules', element: <ContentPage /> },
      { path: '/admin/settings', element: <h1>Settings page</h1> },
    ],
  }], { initialEntries: ['/admin/content-modules'] })
  render(<RouterProvider router={router} />)
  return router
}

describe('unsaved changes guard', () => {
  afterEach(() => clearUnsavedChanges())

  it('lets you leave freely when nothing is unsaved', async () => {
    const user = userEvent.setup()
    renderAdmin()
    await user.click(screen.getByRole('link', { name: 'Go to settings' }))
    expect(await screen.findByRole('heading', { name: 'Settings page' })).toBeInTheDocument()
  })

  it('asks before leaving the page with unsaved edits, and keeps them on "Keep editing"', async () => {
    const user = userEvent.setup()
    renderAdmin()
    await user.type(screen.getByLabelText('Headline'), 'Hello')
    expect(screen.getByRole('region', { name: 'Unsaved changes' })).toHaveTextContent('1 unsaved change')
    expect(screen.getByText('About has unsaved changes')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Go to settings' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Discard unsaved changes?')
    expect(dialog).toHaveTextContent('You have unsaved changes in About PESO.')

    await user.click(screen.getByRole('button', { name: 'Keep editing' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByLabelText('Headline')).toHaveValue('Hello')
    expect(screen.queryByRole('heading', { name: 'Settings page' })).not.toBeInTheDocument()
  })

  it('asks on a tab switch too, and goes on when you discard', async () => {
    const user = userEvent.setup()
    renderAdmin()
    await user.type(screen.getByLabelText('Headline'), 'Hello')

    await user.click(screen.getByRole('button', { name: 'Office info tab' }))
    await screen.findByRole('dialog')
    expect(screen.getByText('Tab: about')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Discard changes' }))
    expect(await screen.findByText('Tab: office')).toBeInTheDocument()
    expect(screen.queryByText('About has unsaved changes')).not.toBeInTheDocument()
  })
})
