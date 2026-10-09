import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseServerClient } from '@/lib/supabase-server'

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

const { requestPasswordReset } = await import('./actions')

describe('requestPasswordReset', () => {
  const resetMock = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { resetPasswordForEmail: resetMock },
    } as never)
  })

  function makeFormData(email: string) {
    const fd = new FormData()
    fd.set('email', email)
    return fd
  }

  it('calls resetPasswordForEmail with the email from FormData', async () => {
    resetMock.mockResolvedValue({ error: null })

    await requestPasswordReset(makeFormData('user@example.com'))

    expect(resetMock).toHaveBeenCalledWith('user@example.com')
  })

  it('returns no error on success', async () => {
    resetMock.mockResolvedValue({ error: null })

    const result = await requestPasswordReset(makeFormData('user@example.com'))

    expect(result).toEqual({ error: null })
  })

  it('returns the error message on failure', async () => {
    resetMock.mockResolvedValue({ error: { message: 'Email rate limit exceeded' } })

    const result = await requestPasswordReset(makeFormData('user@example.com'))

    expect(result).toEqual({ error: 'Email rate limit exceeded' })
  })
})
