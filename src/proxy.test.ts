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

describe('proxy', () => {
  const getUserMock = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getUser: getUserMock },
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
  })

  describe('authenticated requests to protected routes', () => {
    beforeEach(() => {
      getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    })

    it('passes through /dashboard', async () => {
      const res = await proxy(makeRequest('/dashboard'))
      expect(res.headers.get('location')).toBeNull()
    })

    it('passes through /setup', async () => {
      const res = await proxy(makeRequest('/setup'))
      expect(res.headers.get('location')).toBeNull()
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
