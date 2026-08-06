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

const { fetchRotationGroups, createRotationGroup, fetchRotationGroup, updateRotationGroup, fetchRotationGroupRoster, fetchAvailableEmployees, addRotationGroupMember, removeRotationGroupMember, moveRotationGroupMember } = await import('./actions')

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
  builder.order = vi.fn().mockReturnValue(builder)
  builder.update = vi.fn().mockReturnValue(builder)
  builder.insert = vi.fn().mockReturnValue(builder)
  builder.delete = vi.fn().mockReturnValue(builder)
  builder.upsert = vi.fn().mockReturnValue(builder)
  return builder
}

const userId = 'user-1'
const employeeRow = { company_id: 'co-1' }
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

describe('fetchRotationGroupRoster', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthAs(userId)
  })

  it('returns an error when not authenticated', async () => {
    mockAuthAs(null)
    const result = await fetchRotationGroupRoster('rg-1')
    expect(result).toEqual({ data: null, error: 'Not authenticated' })
  })

  it('returns an error when the group is not in the caller company', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
    vi.mocked(supabaseAdmin.from).mockReturnValueOnce(makeQueryBuilder(null) as never)
    const result = await fetchRotationGroupRoster('rg-1')
    expect(result).toEqual({ data: null, error: 'Rotation group not found' })
  })

  it('scopes the group check by id and company_id', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
    const groupBuilder = makeQueryBuilder({ id: 'rg-1' })
    const rosterBuilder = makeQueryBuilder([])
    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(groupBuilder as never)
      .mockReturnValueOnce(rosterBuilder as never)
    await fetchRotationGroupRoster('rg-1')
    expect(groupBuilder.eq).toHaveBeenCalledWith('id', 'rg-1')
    expect(groupBuilder.eq).toHaveBeenCalledWith('company_id', 'co-1')
  })

  it('returns an empty roster without an error', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(makeQueryBuilder({ id: 'rg-1' }) as never)
      .mockReturnValueOnce(makeQueryBuilder([]) as never)
    const result = await fetchRotationGroupRoster('rg-1')
    expect(result).toEqual({ data: [], error: null })
  })

  it('returns the roster ordered by position', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
    const rosterBuilder = makeQueryBuilder([
      { employee_id: 'emp-1', position: 1, employee: { name: 'Ada' } },
      { employee_id: 'emp-2', position: 2, employee: { name: 'Grace' } },
    ])
    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(makeQueryBuilder({ id: 'rg-1' }) as never)
      .mockReturnValueOnce(rosterBuilder as never)
    const result = await fetchRotationGroupRoster('rg-1')
    expect(rosterBuilder.order).toHaveBeenCalledWith('position', { ascending: true })
    expect(result).toEqual({
      data: [
        { employee_id: 'emp-1', position: 1, name: 'Ada' },
        { employee_id: 'emp-2', position: 2, name: 'Grace' },
      ],
      error: null,
    })
  })
})


describe('fetchAvailableEmployees', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthAs(userId)
  })

  it('returns an error when not authenticated', async () => {
    mockAuthAs(null)
    const result = await fetchAvailableEmployees('rg-1')
    expect(result).toEqual({ data: null, error: 'Not authenticated' })
  })

  it('returns an error when the group is not in the caller company', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
    vi.mocked(supabaseAdmin.from).mockReturnValueOnce(makeQueryBuilder(null) as never)
    const result = await fetchAvailableEmployees('rg-1')
    expect(result).toEqual({ data: null, error: 'Rotation group not found' })
  })

  it('lists only active employees in the caller company', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
    const empBuilder = makeQueryBuilder([{ id: 'emp-1', name: 'Ada' }])
    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(makeQueryBuilder({ id: 'rg-1' }) as never)
      .mockReturnValueOnce(makeQueryBuilder([]) as never)
      .mockReturnValueOnce(empBuilder as never)
    await fetchAvailableEmployees('rg-1')
    expect(empBuilder.eq).toHaveBeenCalledWith('company_id', 'co-1')
    expect(empBuilder.eq).toHaveBeenCalledWith('is_active', true)
  })

  it('excludes employees already in the group', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(makeQueryBuilder({ id: 'rg-1' }) as never)
      .mockReturnValueOnce(makeQueryBuilder([{ employee_id: 'emp-1' }]) as never)
      .mockReturnValueOnce(makeQueryBuilder([{ id: 'emp-1', name: 'Ada' }, { id: 'emp-2', name: 'Grace' }]) as never)
    const result = await fetchAvailableEmployees('rg-1')
    expect(result).toEqual({ data: [{ id: 'emp-2', name: 'Grace' }], error: null })
  })
})

describe('addRotationGroupMember', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthAs(userId)
  })
  it('returns an error when not authenticated', async () => {
    mockAuthAs(null)
    const result = await addRotationGroupMember('rg-1', 'emp-1')
    expect(result).toEqual({ error: 'Not authenticated' })
  })
  it('returns an error when the group is not in the caller company', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
    vi.mocked(supabaseAdmin.from).mockReturnValueOnce(makeQueryBuilder(null) as never)
    const result = await addRotationGroupMember('rg-1', 'emp-1')
    expect(result).toEqual({ error: 'Rotation group not found' })
  })
  it('returns an error when the employee is not in the caller company', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(makeQueryBuilder({ id: 'rg-1' }) as never)
      .mockReturnValueOnce(makeQueryBuilder(null) as never)
    const result = await addRotationGroupMember('rg-1', 'emp-9')
    expect(result).toEqual({ error: 'Employee not found' })
  })
  it('inserts at position 1 when the group is empty', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
    const insertBuilder = makeQueryBuilder(null)
    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(makeQueryBuilder({ id: 'rg-1' }) as never)
      .mockReturnValueOnce(makeQueryBuilder({ id: 'emp-1' }) as never)
      .mockReturnValueOnce(makeQueryBuilder(null) as never)
      .mockReturnValueOnce(insertBuilder as never)
    const result = await addRotationGroupMember('rg-1', 'emp-1')
    expect(insertBuilder.insert).toHaveBeenCalledWith([{ rotation_group_id: 'rg-1', employee_id: 'emp-1', position: 1 }])
    expect(result).toEqual({ error: null })
  })
  it('appends after the highest existing position', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
    const insertBuilder = makeQueryBuilder(null)
    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(makeQueryBuilder({ id: 'rg-1' }) as never)
      .mockReturnValueOnce(makeQueryBuilder({ id: 'emp-2' }) as never)
      .mockReturnValueOnce(makeQueryBuilder({ position: 7 }) as never)
      .mockReturnValueOnce(insertBuilder as never)
    await addRotationGroupMember('rg-1', 'emp-2')
    expect(insertBuilder.insert).toHaveBeenCalledWith([{ rotation_group_id: 'rg-1', employee_id: 'emp-2', position: 8 }])
  })
  it('returns the error message when the insert fails', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(makeQueryBuilder({ id: 'rg-1' }) as never)
      .mockReturnValueOnce(makeQueryBuilder({ id: 'emp-1' }) as never)
      .mockReturnValueOnce(makeQueryBuilder(null) as never)
      .mockReturnValueOnce(makeQueryBuilder(null, { message: 'duplicate key' }) as never)
    const result = await addRotationGroupMember('rg-1', 'emp-1')
    expect(result).toEqual({ error: 'duplicate key' })
  })
})

describe('removeRotationGroupMember', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthAs(userId)
  })
  it('returns an error when not authenticated', async () => {
    mockAuthAs(null)
    const result = await removeRotationGroupMember('rg-1', 'emp-1')
    expect(result).toEqual({ error: 'Not authenticated' })
  })
  it('returns an error when the group is not in the caller company', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
    vi.mocked(supabaseAdmin.from).mockReturnValueOnce(makeQueryBuilder(null) as never)
    const result = await removeRotationGroupMember('rg-1', 'emp-1')
    expect(result).toEqual({ error: 'Rotation group not found' })
  })
  it('deletes scoped to the group and the employee', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
    const deleteBuilder = makeQueryBuilder(null)
    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(makeQueryBuilder({ id: 'rg-1' }) as never)
      .mockReturnValueOnce(deleteBuilder as never)
    const result = await removeRotationGroupMember('rg-1', 'emp-1')
    expect(deleteBuilder.delete).toHaveBeenCalled()
    expect(deleteBuilder.eq).toHaveBeenCalledWith('rotation_group_id', 'rg-1')
    expect(deleteBuilder.eq).toHaveBeenCalledWith('employee_id', 'emp-1')
    expect(result).toEqual({ error: null })
  })
  it('returns the error message when the delete fails', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(makeQueryBuilder({ id: 'rg-1' }) as never)
      .mockReturnValueOnce(makeQueryBuilder(null, { message: 'delete failed' }) as never)
    const result = await removeRotationGroupMember('rg-1', 'emp-1')
    expect(result).toEqual({ error: 'delete failed' })
  })
})
describe('moveRotationGroupMember', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthAs(userId)
  })
  it('returns an error when not authenticated', async () => {
    mockAuthAs(null)
    const result = await moveRotationGroupMember('rg-1', 'emp-1', 'up')
    expect(result).toEqual({ error: 'Not authenticated' })
  })
  it('returns an error when the group is not in the caller company', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
    vi.mocked(supabaseAdmin.from).mockReturnValueOnce(makeQueryBuilder(null) as never)
    const result = await moveRotationGroupMember('rg-1', 'emp-1', 'up')
    expect(result).toEqual({ error: 'Rotation group not found' })
  })
  it('returns an error when the member is not in the group', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(makeQueryBuilder({ id: 'rg-1' }) as never)
      .mockReturnValueOnce(makeQueryBuilder([{ employee_id: 'emp-1', position: 1 }]) as never)
    const result = await moveRotationGroupMember('rg-1', 'emp-9', 'up')
    expect(result).toEqual({ error: 'Member not found in group' })
  })
  it('returns an error when moving the first member up', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(makeQueryBuilder({ id: 'rg-1' }) as never)
      .mockReturnValueOnce(makeQueryBuilder([
        { employee_id: 'emp-1', position: 1 },
        { employee_id: 'emp-2', position: 3 },
      ]) as never)
    const result = await moveRotationGroupMember('rg-1', 'emp-1', 'up')
    expect(result).toEqual({ error: 'Already first' })
  })
  it('returns an error when moving the last member down', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(makeQueryBuilder({ id: 'rg-1' }) as never)
      .mockReturnValueOnce(makeQueryBuilder([
        { employee_id: 'emp-1', position: 1 },
        { employee_id: 'emp-2', position: 3 },
      ]) as never)
    const result = await moveRotationGroupMember('rg-1', 'emp-2', 'down')
    expect(result).toEqual({ error: 'Already last' })
  })
  it('upserts both rows with positions exchanged when moving up', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
    const upsertBuilder = makeQueryBuilder(null)
    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(makeQueryBuilder({ id: 'rg-1' }) as never)
      .mockReturnValueOnce(makeQueryBuilder([
        { employee_id: 'emp-1', position: 1 },
        { employee_id: 'emp-2', position: 3 },
      ]) as never)
      .mockReturnValueOnce(upsertBuilder as never)
    const result = await moveRotationGroupMember('rg-1', 'emp-2', 'up')
    expect(upsertBuilder.upsert).toHaveBeenCalledWith([
      { rotation_group_id: 'rg-1', employee_id: 'emp-2', position: 1 },
      { rotation_group_id: 'rg-1', employee_id: 'emp-1', position: 3 },
    ])
    expect(result).toEqual({ error: null })
  })
  it('returns the error message when the upsert fails', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(employeeRow) as never)
    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(makeQueryBuilder({ id: 'rg-1' }) as never)
      .mockReturnValueOnce(makeQueryBuilder([
        { employee_id: 'emp-1', position: 1 },
        { employee_id: 'emp-2', position: 3 },
      ]) as never)
      .mockReturnValueOnce(makeQueryBuilder(null, { message: 'upsert failed' }) as never)
    const result = await moveRotationGroupMember('rg-1', 'emp-2', 'up')
    expect(result).toEqual({ error: 'upsert failed' })
  })
})
