// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as matchers from '@testing-library/jest-dom/matchers'
import SetupPage from './page'
import { saveCompany } from './actions'

expect.extend(matchers)

vi.mock('./actions', () => ({ saveCompany: vi.fn() }))

const saveCompanyMock = vi.mocked(saveCompany)

beforeEach(() => {
  saveCompanyMock.mockReset()
  saveCompanyMock.mockResolvedValue(undefined)
})

afterEach(cleanup)

describe('SetupPage', () => {
  it('renders the company name field', () => {
    render(<SetupPage />)
    expect(screen.getByRole('heading', { name: 'Set up your company' })).toBeInTheDocument()
    expect(screen.getByLabelText('Company name')).toBeInTheDocument()
  })

  it('calls saveCompany with the entered name', async () => {
    const user = userEvent.setup()
    render(<SetupPage />)
    await user.type(screen.getByLabelText('Company name'), 'Acme HVAC')
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))
    expect(saveCompanyMock).toHaveBeenCalledWith({ name: 'Acme HVAC' })
  })

  it('shows the error and re-enables the button when saveCompany fails', async () => {
    saveCompanyMock.mockRejectedValue(new Error('Not authenticated'))
    const user = userEvent.setup()
    render(<SetupPage />)
    await user.type(screen.getByLabelText('Company name'), 'Acme HVAC')
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Not authenticated')
    })
    expect(screen.getByRole('button', { name: 'Save and continue' })).toBeEnabled()
  })
})
