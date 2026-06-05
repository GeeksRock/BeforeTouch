import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase'
import { createSupabaseServerClient } from '@/lib/supabase-server'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

const { fetchIsAdmin } = await import('./nav-actions')
const { getNavLinks } = await import('./nav-links')

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

const userId = 'user-1'

function mockAuthAs(id: string | null) {
  const getUserMock = vi.fn().mockResolvedValue({
    data: { user: id ? { id } : null },
    error: null,
  })
  vi.mocked(createSupabaseServerClient).mockReturnValue(
    Promise.resolve({
      auth: { getUser: getUserMock },
      from: supabase.from,
    }) as never,
  )
}

describe('fetchIsAdmin', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns true when the employee is_admin flag is true', async () => {
    mockAuthAs(userId)
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder({ is_admin: true }) as never)
    expect(await fetchIsAdmin()).toBe(true)
  })

  it('returns false when the employee is_admin flag is false', async () => {
    mockAuthAs(userId)
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder({ is_admin: false }) as never)
    expect(await fetchIsAdmin()).toBe(false)
  })

  it('returns false when not authenticated', async () => {
    mockAuthAs(null)
    expect(await fetchIsAdmin()).toBe(false)
  })

  it('returns false when the employee record is not found', async () => {
    mockAuthAs(userId)
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(null) as never)
    expect(await fetchIsAdmin()).toBe(false)
  })

  it('returns false when the employee query fails', async () => {
    mockAuthAs(userId)
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeQueryBuilder(null, { message: 'query failed' }) as never,
    )
    expect(await fetchIsAdmin()).toBe(false)
  })
})

describe('getNavLinks', () => {
  describe('when admin', () => {
    const links = getNavLinks(true)

    it('includes Dashboard', () => {
      expect(links.some(l => l.href === '/dashboard')).toBe(true)
    })

    it('includes Employees', () => {
      expect(links.some(l => l.href === '/setup/employees')).toBe(true)
    })

    it('includes Rotation', () => {
      expect(links.some(l => l.href === '/setup/rotation')).toBe(true)
    })

    it('includes Settings', () => {
      expect(links.some(l => l.href === '/settings')).toBe(true)
    })

    it('includes Profile', () => {
      expect(links.some(l => l.href === '/profile')).toBe(true)
    })

    it('returns exactly 5 links', () => {
      expect(links).toHaveLength(5)
    })
  })

  describe('when not admin', () => {
    const links = getNavLinks(false)

    it('includes Dashboard', () => {
      expect(links.some(l => l.href === '/dashboard')).toBe(true)
    })

    it('includes Profile', () => {
      expect(links.some(l => l.href === '/profile')).toBe(true)
    })

    it('does not include Settings', () => {
      expect(links.some(l => l.href === '/settings')).toBe(false)
    })

    it('does not include Employees', () => {
      expect(links.some(l => l.href === '/setup/employees')).toBe(false)
    })

    it('does not include Rotation', () => {
      expect(links.some(l => l.href === '/setup/rotation')).toBe(false)
    })

    it('returns exactly 2 links', () => {
      expect(links).toHaveLength(2)
    })
  })
})
