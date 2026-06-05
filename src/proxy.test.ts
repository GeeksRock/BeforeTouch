import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

const { proxy } = await import('./proxy')

function makeRequest(path: string) {
  return new NextRequest(new URL(path, 'http://localhost'))
}

function makeQueryBuilder(data: unknown, error: unknown = null) {
  const result = { data, error }
  const builder: Record<string, unknown> = {
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  builder.eq = vi.fn().mockReturnValue(builder)
  builder.select = vi.fn().mockReturnValue(builder)
  builder.limit = vi.fn().mockReturnValue(builder)
  return builder
}

describe('proxy', () => {
  const getUserMock = vi.fn()
  const fromMock = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getUser: getUserMock },
      from: fromMock,
    } as never)
  })

  describe('unauthenticated requests to protected routes', () => {
    beforeEach(() => {
      getUserMock.mockResolvedValue({ data: { user: null } })
    })

    it('redirects /dashboard to /login', async () => {
      const res = await proxy(makeRequest('/dashboard'))
      expect(res.headers.get('location')).toContain('/login')
    })

    it('redirects /setup to /login', async () => {
      const res = await proxy(makeRequest('/setup'))
      expect(res.headers.get('location')).toContain('/login')
    })

    it('redirects /setup/employees to /login', async () => {
      const res = await proxy(makeRequest('/setup/employees'))
      expect(res.headers.get('location')).toContain('/login')
    })

    it('redirects /setup/rotation to /login', async () => {
      const res = await proxy(makeRequest('/setup/rotation'))
      expect(res.headers.get('location')).toContain('/login')
    })

    it('redirects /settings to /login', async () => {
      const res = await proxy(makeRequest('/settings'))
      expect(res.headers.get('location')).toContain('/login')
    })
  })

  describe('authenticated requests to protected routes', () => {
    beforeEach(() => {
      getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      fromMock.mockReturnValue(makeQueryBuilder({ is_active: true }))
    })

    it('passes through /dashboard for an active employee', async () => {
      const res = await proxy(makeRequest('/dashboard'))
      expect(res.headers.get('location')).toBeNull()
    })

    it('passes through /setup for an active employee', async () => {
      const res = await proxy(makeRequest('/setup'))
      expect(res.headers.get('location')).toBeNull()
    })

    it('passes through /settings for an active employee', async () => {
      const res = await proxy(makeRequest('/settings'))
      expect(res.headers.get('location')).toBeNull()
    })

    it('redirects to /login when employee is_active is false', async () => {
      fromMock.mockReturnValue(makeQueryBuilder({ is_active: false }))
      const res = await proxy(makeRequest('/dashboard'))
      expect(res.headers.get('location')).toContain('/login')
    })

    it('passes through when no employee record exists for the user', async () => {
      fromMock.mockReturnValue(makeQueryBuilder(null))
      const res = await proxy(makeRequest('/dashboard'))
      expect(res.headers.get('location')).toBeNull()
    })

    it('queries employee table by auth_user_id', async () => {
      await proxy(makeRequest('/dashboard'))
      expect(fromMock).toHaveBeenCalledWith('employee')
    })
  })

  describe('public routes', () => {
    beforeEach(() => {
      getUserMock.mockResolvedValue({ data: { user: null } })
    })

    it('passes through /login', async () => {
      const res = await proxy(makeRequest('/login'))
      expect(res.headers.get('location')).toBeNull()
    })

    it('passes through /signup', async () => {
      const res = await proxy(makeRequest('/signup'))
      expect(res.headers.get('location')).toBeNull()
    })

    it('passes through /', async () => {
      const res = await proxy(makeRequest('/'))
      expect(res.headers.get('location')).toBeNull()
    })
  })
})
