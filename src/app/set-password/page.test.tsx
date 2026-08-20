// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const setSession = vi.fn()
const getSession = vi.fn()
const updateUser = vi.fn()
const replace = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({ auth: { setSession, getSession, updateUser } }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}))

import SetPasswordPage from './page'

const TOKENS = '#access_token=abc123&refresh_token=xyz789&type=invite'

beforeEach(() => {
  vi.clearAllMocks()
  window.location.hash = TOKENS
  setSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })
  getSession.mockResolvedValue({ data: { session: { user: { id: 'other' } } } })
  updateUser.mockResolvedValue({ error: null })
})
afterEach(() => {
  cleanup()
  window.location.hash = ''
})

describe('SetPasswordPage', () => {
  it('establishes the session from the tokens in the fragment', async () => {
    render(<SetPasswordPage />)
    expect(await screen.findByLabelText(/password/i)).toBeDefined()
    expect(setSession).toHaveBeenCalledWith({
      access_token: 'abc123',
      refresh_token: 'xyz789',
    })
  })

  it('shows an error and no form when the fragment has no tokens', async () => {
    window.location.hash = '#error=access_denied&error_code=otp_expired'
    render(<SetPasswordPage />)
    expect(await screen.findByText(/invalid or has expired/i)).toBeDefined()
    expect(screen.queryByLabelText(/password/i)).toBeNull()
  })

  it('never falls back to an existing signed-in session', async () => {
    window.location.hash = ''
    render(<SetPasswordPage />)
    expect(await screen.findByText(/invalid or has expired/i)).toBeDefined()
    expect(getSession).not.toHaveBeenCalled()
    expect(setSession).not.toHaveBeenCalled()
  })

  it('shows an error when the tokens are rejected', async () => {
    setSession.mockResolvedValue({ data: { session: null }, error: { message: 'bad token' } })
    render(<SetPasswordPage />)
    expect(await screen.findByText(/invalid or has expired/i)).toBeDefined()
    expect(screen.queryByLabelText(/password/i)).toBeNull()
  })

  it('saves the password and redirects to the dashboard', async () => {
    const user = userEvent.setup()
    render(<SetPasswordPage />)
    await user.type(await screen.findByLabelText(/password/i), 'hunter2pass')
    await user.click(screen.getByRole('button', { name: /set password/i }))
    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith({ password: 'hunter2pass' }),
    )
    expect(replace).toHaveBeenCalledWith('/dashboard')
  })

  it('shows the error when the update fails', async () => {
    updateUser.mockResolvedValue({ error: { message: 'Password too short' } })
    const user = userEvent.setup()
    render(<SetPasswordPage />)
    await user.type(await screen.findByLabelText(/password/i), 'short')
    await user.click(screen.getByRole('button', { name: /set password/i }))
    expect(await screen.findByText(/password too short/i)).toBeDefined()
    expect(replace).not.toHaveBeenCalled()
  })
})
