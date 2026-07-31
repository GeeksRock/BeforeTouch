import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

const { default: SetupPage } = await import('./page')

interface ClientOverrides {
  companyResult?: { data: unknown; error: unknown }
  userId?: string
}

function useClient({
  companyResult = { data: null, error: null },
  userId = 'user-1',
}: ClientOverrides = {}) {
  const companyMaybeSingle = vi.fn().mockResolvedValue(companyResult)
  const companyEq = vi.fn().mockReturnValue({ maybeSingle: companyMaybeSingle })
  const companySelect = vi.fn().mockReturnValue({ eq: companyEq })
  const fromMock = vi.fn().mockReturnValue({ select: companySelect })

  const getUserMock = vi.fn().mockResolvedValue({
    data: { user: userId ? { id: userId } : null },
  })

  const client = { auth: { getUser: getUserMock }, from: fromMock }
  vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never)

  return { fromMock }
}

describe('SetupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when not authenticated', async () => {
    useClient({ userId: '' })
    await expect(SetupPage()).rejects.toThrow('Not authenticated')
  })

  it('calls redirect when the company query returns a row', async () => {
    useClient({ companyResult: { data: { id: 'co-1' }, error: null } })
    await SetupPage()
    expect(redirect).toHaveBeenCalledWith('/dashboard/admin')
  })

  it('does not call redirect when the company query returns null', async () => {
    useClient({ companyResult: { data: null, error: null } })
    await SetupPage()
    expect(redirect).not.toHaveBeenCalled()
  })
})
