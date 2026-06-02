import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

const { signup } = await import('./actions')

describe('signup', () => {
  const signUpMock = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { signUp: signUpMock },
    } as never)
  })

  function makeFormData(email: string, password: string) {
    const fd = new FormData()
    fd.set('email', email)
    fd.set('password', password)
    return fd
  }

  it('calls signUp with email and password from FormData', async () => {
    signUpMock.mockResolvedValue({ error: null })

    await signup(makeFormData('new@example.com', 'secret123'))

    expect(signUpMock).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'secret123',
    })
  })

  it('redirects to /dashboard on success', async () => {
    signUpMock.mockResolvedValue({ error: null })

    await signup(makeFormData('new@example.com', 'secret123'))

    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/dashboard')
  })

  it('returns an error message without redirecting on failure', async () => {
    signUpMock.mockResolvedValue({ error: { message: 'Email already registered' } })

    const result = await signup(makeFormData('existing@example.com', 'secret123'))

    expect(result).toEqual({ error: 'Email already registered' })
    expect(vi.mocked(redirect)).not.toHaveBeenCalled()
  })
})
