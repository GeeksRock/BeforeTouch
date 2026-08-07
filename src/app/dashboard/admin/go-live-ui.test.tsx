// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockFetch = vi.fn()
const mockGoLive = vi.fn()
vi.mock('./actions', () => ({ fetchAdminDashboard: () => mockFetch() }))
vi.mock('./go-live', () => ({ goLive: (d: string) => mockGoLive(d) }))

import AdminDashboard from './page'

const setupData = {
  company: { id: 'co-1', name: 'Acme HVAC', state: 'setup' },
  rotation: null,
  employees: [],
}

describe('AdminDashboard go-live', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({ data: setupData, error: null })
  })

  it('shows the go-live control while the company is in setup', async () => {
    render(<AdminDashboard />)
    expect(await screen.findByRole('button', { name: /go live/i })).toBeTruthy()
  })

  it('calls goLive with the chosen start date', async () => {
    mockGoLive.mockResolvedValue({ error: null })
    render(<AdminDashboard />)
    const input = await screen.findByLabelText(/start date/i)
    await userEvent.type(input, '2026-08-10')
    await userEvent.click(screen.getByRole('button', { name: /go live/i }))
    await waitFor(() => expect(mockGoLive).toHaveBeenCalledWith('2026-08-10'))
  })

  it('shows the error when goLive refuses', async () => {
    mockGoLive.mockResolvedValue({ error: 'Service needs at least 2 members' })
    render(<AdminDashboard />)
    const input = await screen.findByLabelText(/start date/i)
    await userEvent.type(input, '2026-08-10')
    await userEvent.click(screen.getByRole('button', { name: /go live/i }))
    expect(await screen.findByText(/Service needs at least 2 members/)).toBeTruthy()
  })

  it('does not show the go-live control once the company is live', async () => {
    mockFetch.mockResolvedValue({
      data: { ...setupData, company: { ...setupData.company, state: 'live' } },
      error: null,
    })
    render(<AdminDashboard />)
    await screen.findByText('Acme HVAC')
    expect(screen.queryByRole('button', { name: /go live/i })).toBeNull()
  })
})
