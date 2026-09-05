// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const updateUser = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({ auth: { updateUser } }),
}))

import ChangePassword from './ChangePassword'

beforeEach(() => {
  vi.clearAllMocks()
  updateUser.mockResolvedValue({ error: null })
})
afterEach(() => {
  cleanup()
})

describe('ChangePassword', () => {
  it('changes the password when both fields match', async () => {
    const user = userEvent.setup()
    render(<ChangePassword />)
    await user.type(screen.getByLabelText(/^new password/i), 'newpass123')
    await user.type(screen.getByLabelText(/confirm/i), 'newpass123')
    await user.click(screen.getByRole('button', { name: /change password/i }))
    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith({ password: 'newpass123' }),
    )
  })

  it('shows a success message and clears the fields after success', async () => {
    const user = userEvent.setup()
    render(<ChangePassword />)
    await user.type(screen.getByLabelText(/^new password/i), 'newpass123')
    await user.type(screen.getByLabelText(/confirm/i), 'newpass123')
    await user.click(screen.getByRole('button', { name: /change password/i }))
    expect(await screen.findByText(/password changed/i)).toBeDefined()
    expect((screen.getByLabelText(/^new password/i) as HTMLInputElement).value).toBe('')
  })

  it('does not call updateUser when the fields do not match', async () => {
    const user = userEvent.setup()
    render(<ChangePassword />)
    await user.type(screen.getByLabelText(/^new password/i), 'newpass123')
    await user.type(screen.getByLabelText(/confirm/i), 'different456')
    await user.click(screen.getByRole('button', { name: /change password/i }))
    expect(await screen.findByText(/do not match/i)).toBeDefined()
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('shows the error when updateUser fails', async () => {
    updateUser.mockResolvedValue({ error: { message: 'Password should be at least 6 characters' } })
    const user = userEvent.setup()
    render(<ChangePassword />)
    await user.type(screen.getByLabelText(/^new password/i), 'short')
    await user.type(screen.getByLabelText(/confirm/i), 'short')
    await user.click(screen.getByRole('button', { name: /change password/i }))
    expect(await screen.findByText(/at least 6 characters/i)).toBeDefined()
  })
})
