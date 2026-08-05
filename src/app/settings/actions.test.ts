import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}))
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

const { fetchCompany, updateCompany, fetchRotationGroups, createRotationGroup, fetchRotationGroup, updateRotationGroup } = await import('./actions')

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
  builder.insert = vi.fn().mockReturnValue(builder)
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

describe('fetchRotationGroups', () => {
  it('returns the rotation groups for the caller company', async () => {
    const from = vi.fn().mockReturnValue(makeQueryBuilder(employeeRow) as never)
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
      from,
    } as never)
    vi.mocked(supabaseAdmin.from).mockReturnValue(
      makeQueryBuilder([{ id: 'rg-1', name: 'Night shift' }]) as never
    )
    const result = await fetchRotationGroups()
    expect(from).toHaveBeenCalledWith('employee')
    expect(supabaseAdmin.from).toHaveBeenCalledWith('rotation_group')
    expect(result).toEqual({ data: [{ id: 'rg-1', name: 'Night shift' }], error: null })
  })
})

describe('createRotationGroup', () => {
  const groupForm = {
    name: 'Night shift',
    rotation_length: '1_week',
    rotation_start_day: 'Monday',
    rotation_start_time: '09:00',
    has_backup: false,
    allowed_volunteer_types: ['full_rotation'],
    approval_approver: 'on_call' as const,
  }
  it('inserts the group scoped to the caller company', async () => {
    const insertBuilder = makeQueryBuilder(null)
    const from = vi.fn().mockReturnValue(makeQueryBuilder(employeeRow) as never)
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
      from,
    } as never)
    vi.mocked(supabaseAdmin.from).mockReturnValue(insertBuilder as never)
    const result = await createRotationGroup(groupForm)
    expect(supabaseAdmin.from).toHaveBeenCalledWith('rotation_group')
    expect(insertBuilder.insert).toHaveBeenCalledWith([{ ...groupForm, company_id: 'co-1' }])
    expect(result).toEqual({ error: null })
  })
})

describe('fetchRotationGroup', () => {
  const groupRow = {
    name: 'Night shift',
    rotation_length: '1_week',
    rotation_start_day: 'Monday',
    rotation_start_time: '09:00',
    has_backup: false,
    allowed_volunteer_types: ['full_rotation'],
    approval_approver: 'on_call',
  }
  it('returns the group scoped to id and company', async () => {
    const groupBuilder = makeQueryBuilder(groupRow)
    const from = vi.fn().mockReturnValue(makeQueryBuilder(employeeRow) as never)
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
      from,
    } as never)
    vi.mocked(supabaseAdmin.from).mockReturnValue(groupBuilder as never)
    const result = await fetchRotationGroup('rg-1')
    expect(supabaseAdmin.from).toHaveBeenCalledWith('rotation_group')
    expect(groupBuilder.eq).toHaveBeenCalledWith('id', 'rg-1')
    expect(groupBuilder.eq).toHaveBeenCalledWith('company_id', 'co-1')
    expect(result).toEqual({ data: groupRow, error: null })
  })
})

describe('updateRotationGroup', () => {
  const groupForm = {
    name: 'Day shift',
    rotation_length: '2_weeks',
    rotation_start_day: 'Friday',
    rotation_start_time: '08:00',
    has_backup: true,
    allowed_volunteer_types: ['individual_days'],
    approval_approver: 'manager' as const,
  }
  it('updates the group scoped to id and company', async () => {
    const updateBuilder = makeQueryBuilder(null)
    const from = vi.fn().mockReturnValue(makeQueryBuilder(employeeRow) as never)
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
      from,
    } as never)
    vi.mocked(supabaseAdmin.from).mockReturnValue(updateBuilder as never)
    const result = await updateRotationGroup('rg-1', groupForm)
    expect(supabaseAdmin.from).toHaveBeenCalledWith('rotation_group')
    expect(updateBuilder.update).toHaveBeenCalledWith(groupForm)
    expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'rg-1')
    expect(updateBuilder.eq).toHaveBeenCalledWith('company_id', 'co-1')
    expect(result).toEqual({ error: null })
  })
})
