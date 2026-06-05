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

const { fetchCompany, updateCompany } = await import('./actions')

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
const employeeRow = { company_id: 'co-1' }
const companyData = {
  name: 'Acme',
  rotation_length: '1_week',
  rotation_start_day: 'Monday',
  rotation_start_time: '09:00',
  rotation_end_day: 'Friday',
  rotation_end_time: '17:00',
  has_backup: false,
  allowed_volunteer_types: ['full_rotation'],
  approval_approver: 'on_call',
}

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

describe('fetchCompany', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockAuthAs(userId)
    vi.mocked(supabase.from)
      .mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
      .mockReturnValueOnce(makeQueryBuilder(companyData) as never)
  })

  it('returns the company data', async () => {
    const result = await fetchCompany()
    expect(result.data).toEqual(companyData)
    expect(result.error).toBeNull()
  })

  it('queries employee table to get company_id', async () => {
    await fetchCompany()
    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('employee')
  })

  it('queries company table with the company_id', async () => {
    await fetchCompany()
    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('company')
  })

  it('returns an error when not authenticated', async () => {
    mockAuthAs(null)
    const result = await fetchCompany()
    expect(result.error).toBe('Not authenticated')
    expect(result.data).toBeNull()
  })

  it('returns an error when the employee query fails', async () => {
    vi.resetAllMocks()
    mockAuthAs(userId)
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeQueryBuilder(null, { message: 'employee query failed' }) as never,
    )
    const result = await fetchCompany()
    expect(result.error).toBe('employee query failed')
  })

  it('returns an error when employee record not found', async () => {
    vi.resetAllMocks()
    mockAuthAs(userId)
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(null) as never)
    const result = await fetchCompany()
    expect(result.error).toBe('Employee record not found')
  })

  it('returns an error when the company query fails', async () => {
    vi.resetAllMocks()
    mockAuthAs(userId)
    vi.mocked(supabase.from)
      .mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
      .mockReturnValueOnce(makeQueryBuilder(null, { message: 'company query failed' }) as never)
    const result = await fetchCompany()
    expect(result.error).toBe('company query failed')
  })
})

describe('updateCompany', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockAuthAs(userId)
  })

  it('updates the company with the form data', async () => {
    const updateBuilder = makeQueryBuilder(null)
    vi.mocked(supabase.from)
      .mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
      .mockReturnValueOnce(updateBuilder as never)

    const result = await updateCompany(companyData as never)

    expect(result.error).toBeNull()
    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('company')
    expect(updateBuilder.update).toHaveBeenCalledWith(companyData)
  })

  it('queries employee table to get company_id', async () => {
    vi.mocked(supabase.from)
      .mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
      .mockReturnValueOnce(makeQueryBuilder(null) as never)

    await updateCompany(companyData as never)

    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('employee')
  })

  it('returns an error when not authenticated', async () => {
    mockAuthAs(null)
    const result = await updateCompany(companyData as never)
    expect(result.error).toBe('Not authenticated')
  })

  it('returns an error when the employee query fails', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeQueryBuilder(null, { message: 'employee lookup failed' }) as never,
    )
    const result = await updateCompany(companyData as never)
    expect(result.error).toBe('employee lookup failed')
  })

  it('returns an error when employee record not found', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(null) as never)
    const result = await updateCompany(companyData as never)
    expect(result.error).toBe('Employee record not found')
  })

  it('returns an error when the update fails', async () => {
    vi.mocked(supabase.from)
      .mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
      .mockReturnValueOnce(makeQueryBuilder(null, { message: 'update failed' }) as never)

    const result = await updateCompany(companyData as never)
    expect(result.error).toBe('update failed')
  })
})
