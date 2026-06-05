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

const { fetchProfile, updateProfile } = await import('./actions')

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
  builder.update = vi.fn().mockReturnValue(builder)
  return builder
}

const userId = 'user-1'
const profileData = { name: 'Alice', contact: 'alice@example.com' }

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

describe('fetchProfile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockAuthAs(userId)
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(profileData) as never)
  })

  it('returns name and contact', async () => {
    const result = await fetchProfile()
    expect(result.data).toEqual(profileData)
    expect(result.error).toBeNull()
  })

  it('queries the employee table', async () => {
    await fetchProfile()
    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('employee')
  })

  it('returns an error when not authenticated', async () => {
    mockAuthAs(null)
    const result = await fetchProfile()
    expect(result.error).toBe('Not authenticated')
    expect(result.data).toBeNull()
  })

  it('returns an error when the query fails', async () => {
    vi.resetAllMocks()
    mockAuthAs(userId)
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeQueryBuilder(null, { message: 'query failed' }) as never,
    )
    const result = await fetchProfile()
    expect(result.error).toBe('query failed')
  })

  it('returns an error when employee record not found', async () => {
    vi.resetAllMocks()
    mockAuthAs(userId)
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(null) as never)
    const result = await fetchProfile()
    expect(result.error).toBe('Employee record not found')
  })
})

describe('updateProfile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockAuthAs(userId)
  })

  it('updates the employee record with name and contact', async () => {
    const updateBuilder = makeQueryBuilder(null)
    vi.mocked(supabase.from).mockReturnValueOnce(updateBuilder as never)

    const result = await updateProfile(profileData)

    expect(result.error).toBeNull()
    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('employee')
    expect(updateBuilder.update).toHaveBeenCalledWith(profileData)
  })

  it('filters the update by auth_user_id', async () => {
    const updateBuilder = makeQueryBuilder(null)
    vi.mocked(supabase.from).mockReturnValueOnce(updateBuilder as never)

    await updateProfile(profileData)

    expect(updateBuilder.eq).toHaveBeenCalledWith('auth_user_id', userId)
  })

  it('returns an error when not authenticated', async () => {
    mockAuthAs(null)
    const result = await updateProfile(profileData)
    expect(result.error).toBe('Not authenticated')
  })

  it('returns an error when the update fails', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeQueryBuilder(null, { message: 'update failed' }) as never,
    )
    const result = await updateProfile(profileData)
    expect(result.error).toBe('update failed')
  })
})
