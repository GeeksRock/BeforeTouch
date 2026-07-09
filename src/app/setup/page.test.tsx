// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as matchers from '@testing-library/jest-dom/matchers'
expect.extend(matchers)

const saveCompany = vi.fn()
vi.mock('./actions', () => ({
  saveCompany: (...args: unknown[]) => saveCompany(...args),
}))

import SetupPage from './page'

beforeEach(() => {
  saveCompany.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('SetupPage wizard', () => {
  it('starts on step 1 showing the Company heading', () => {
    render(<SetupPage />)
    expect(screen.getByRole('heading', { name: 'Company' })).toBeInTheDocument()
  })

  it('advances to step 2 when Next is clicked', async () => {
    const user = userEvent.setup()
    render(<SetupPage />)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('heading', { name: 'Rotation schedule' })).toBeInTheDocument()
  })

  it('preserves entered data when navigating back', async () => {
    const user = userEvent.setup()
    render(<SetupPage />)
    const nameInput = screen.getByLabelText('Company name')
    await user.type(nameInput, 'Acme HVAC')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('heading', { name: 'Rotation schedule' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByLabelText('Company name')).toHaveValue('Acme HVAC')
  })

  it('shows entered values on the review step', async () => {
    const user = userEvent.setup()
    render(<SetupPage />)
    await user.type(screen.getByLabelText('Company name'), 'Acme HVAC')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('heading', { name: 'Review and save' })).toBeInTheDocument()
    expect(screen.getByText('Acme HVAC')).toBeInTheDocument()
  })

  it('calls saveCompany when Save and continue is clicked', async () => {
    const user = userEvent.setup()
    render(<SetupPage />)
    await user.type(screen.getByLabelText('Company name'), 'Acme HVAC')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))
    expect(saveCompany).toHaveBeenCalledOnce()
  })
})
