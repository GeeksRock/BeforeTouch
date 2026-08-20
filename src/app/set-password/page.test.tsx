// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const getSession = vi.fn()
const updateUser = vi.fn()
const replace = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({ auth: { getSession, updateUser } }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}))

import SetPasswordPage from './page'

beforeEach(() => {
  vi.clearAllMocks()
  getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
  updateUser.mockResolvedValue({ error: null })
})
afterEach(cleanup)

describe('SetPasswordPage', () => {
  it('shows the password form when the invite link established a session', async () => {
    render(<SetPasswordPage />)
    expect(await screen.findByLabelText(/password/i)).toBeDefined()
  })

  it('shows an error and no form when there is no session', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
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
