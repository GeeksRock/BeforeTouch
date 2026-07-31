// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as matchers from '@testing-library/jest-dom/matchers'
import CompanyForm from './company-form'
import { saveCompany } from './actions'

expect.extend(matchers)

vi.mock('./actions', () => ({ saveCompany: vi.fn() }))

const saveCompanyMock = vi.mocked(saveCompany)

beforeEach(() => {
  saveCompanyMock.mockReset()
  saveCompanyMock.mockResolvedValue(undefined)
})

afterEach(cleanup)

describe('CompanyForm', () => {
  it('renders the company name and owner name fields', () => {
    render(<CompanyForm />)
    expect(screen.getByRole('heading', { name: 'Set up your company' })).toBeInTheDocument()
    expect(screen.getByLabelText('Company name')).toBeInTheDocument()
    expect(screen.getByLabelText('Your name')).toBeInTheDocument()
  })

  it('calls saveCompany with the company name and the owner name', async () => {
    const user = userEvent.setup()
    render(<CompanyForm />)
    await user.type(screen.getByLabelText('Company name'), 'Acme HVAC')
    await user.type(screen.getByLabelText('Your name'), 'Michelle E')
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))
    expect(saveCompanyMock).toHaveBeenCalledWith({ name: 'Acme HVAC', ownerName: 'Michelle E' })
  })

  it('shows the error and re-enables the button when saveCompany fails', async () => {
    saveCompanyMock.mockRejectedValue(new Error('Not authenticated'))
    const user = userEvent.setup()
    render(<CompanyForm />)
    await user.type(screen.getByLabelText('Company name'), 'Acme HVAC')
    await user.type(screen.getByLabelText('Your name'), 'Michelle E')
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Not authenticated')
    })
    expect(screen.getByRole('button', { name: 'Save and continue' })).toBeEnabled()
  })
})
