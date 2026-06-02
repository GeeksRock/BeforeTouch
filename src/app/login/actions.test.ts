import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

const { login } = await import('./actions')

describe('login', () => {
  const signInMock = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { signInWithPassword: signInMock },
    } as never)
  })

  function makeFormData(email: string, password: string) {
    const fd = new FormData()
    fd.set('email', email)
    fd.set('password', password)
    return fd
  }

  it('calls signInWithPassword with email and password from FormData', async () => {
    signInMock.mockResolvedValue({ error: null })

    await login(makeFormData('user@example.com', 'secret123'))

    expect(signInMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret123',
    })
  })

  it('redirects to /dashboard on success', async () => {
    signInMock.mockResolvedValue({ error: null })

    await login(makeFormData('user@example.com', 'secret123'))

    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/dashboard')
  })

  it('returns an error message without redirecting on failure', async () => {
    signInMock.mockResolvedValue({ error: { message: 'Invalid login credentials' } })

    const result = await login(makeFormData('user@example.com', 'wrong'))

    expect(result).toEqual({ error: 'Invalid login credentials' })
    expect(vi.mocked(redirect)).not.toHaveBeenCalled()
  })
})
