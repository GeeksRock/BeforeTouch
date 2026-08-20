import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createSupabaseServerClient } from '@/lib/supabase-server'
vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    auth: { admin: { inviteUserByEmail: vi.fn() } },
  },
}))

const { saveEmployee, inviteEmployee } = await import('./actions')

describe('saveEmployee', () => {
  const getUserMock = vi.fn()
  const fromMock = vi.mocked(supabaseAdmin.from)
  const CALLER = { id: 'admin-1', company_id: 'co-1' }
  const validData = {
    name: 'Jane Doe',
    contact: 'jane@example.com',
    can_volunteer: true,
    can_receive_volunteers: true,
    is_active: true,
  }
  function callerChain(result: unknown) {
    const c: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'limit']) c[m] = vi.fn().mockReturnValue(c)
    c.maybeSingle = vi.fn().mockResolvedValue({ data: result, error: null })
    return c
  }
  function insertChain(data: unknown, error: { message: string } | null = null) {
    const c: Record<string, unknown> = {}
    c.insert = vi.fn().mockReturnValue(c)
    c.select = vi.fn().mockReturnValue(c)
    c.single = vi.fn().mockResolvedValue({ data, error })
    return c
  }
  beforeEach(() => {
    vi.resetAllMocks()
    getUserMock.mockResolvedValue({ data: { user: { id: 'auth-admin' } } })
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: getUserMock },
    } as never)
  })
  it('throws when not authenticated', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    await expect(saveEmployee(validData)).rejects.toThrow('Not authenticated')
  })
  it('throws when the caller has no employee record', async () => {
    fromMock.mockReturnValueOnce(callerChain(null) as never)
    await expect(saveEmployee(validData)).rejects.toThrow('Employee record not found')
  })
  it('inserts with company_id derived from the caller', async () => {
    const ins = insertChain({ id: 'new-id' })
    fromMock
      .mockReturnValueOnce(callerChain(CALLER) as never)
      .mockReturnValueOnce(ins as never)
    await saveEmployee(validData)
    expect(ins.insert).toHaveBeenCalledWith([{ ...validData, company_id: 'co-1' }])
  })
  it('saves is_active: false when specified', async () => {
    const ins = insertChain({ id: 'new-id' })
    fromMock
      .mockReturnValueOnce(callerChain(CALLER) as never)
      .mockReturnValueOnce(ins as never)
    await saveEmployee({ ...validData, is_active: false })
    expect(ins.insert).toHaveBeenCalledWith([{ ...validData, is_active: false, company_id: 'co-1' }])
  })
  it('returns the id of the newly created employee', async () => {
    fromMock
      .mockReturnValueOnce(callerChain(CALLER) as never)
      .mockReturnValueOnce(insertChain({ id: 'new-emp-id' }) as never)
    const result = await saveEmployee(validData)
    expect(result).toEqual({ id: 'new-emp-id' })
  })
  it('throws when the insert fails', async () => {
    fromMock
      .mockReturnValueOnce(callerChain(CALLER) as never)
      .mockReturnValueOnce(insertChain(null, { message: 'insert failed' }) as never)
    await expect(saveEmployee(validData)).rejects.toThrow('insert failed')
  })
})
describe('inviteEmployee', () => {
  const inviteMock = vi.mocked(supabaseAdmin.auth.admin.inviteUserByEmail)
  const getUserMock = vi.fn()
  const fromMock = vi.mocked(supabaseAdmin.from)
  const CALLER = { id: 'admin-1', company_id: 'co-1', is_admin: true }
  const TARGET = { id: 'emp-1', contact: 'jane@example.com', is_active: true, auth_user_id: null }
  function selectChain(result: unknown) {
    const c: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'limit']) c[m] = vi.fn().mockReturnValue(c)
    c.maybeSingle = vi.fn().mockResolvedValue({ data: result, error: null })
    return c
  }
  function updateChain(error: { message: string } | null = null) {
    const c: Record<string, unknown> = {}
    c.update = vi.fn().mockReturnValue(c)
    c.eq = vi.fn().mockResolvedValue({ error })
    return c
  }
  beforeEach(() => {
    vi.resetAllMocks()
    getUserMock.mockResolvedValue({ data: { user: { id: 'auth-admin' } } })
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: getUserMock },
    } as never)
  })
  it('throws when not authenticated', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    await expect(inviteEmployee('emp-1')).rejects.toThrow('Not authenticated')
  })
  it('throws when the caller has no employee record', async () => {
    fromMock.mockReturnValueOnce(selectChain(null) as never)
    await expect(inviteEmployee('emp-1')).rejects.toThrow('Employee record not found')
  })
  it('returns an error when the caller is not an admin', async () => {
    fromMock.mockReturnValueOnce(selectChain({ ...CALLER, is_admin: false }) as never)
    const result = await inviteEmployee('emp-1')
    expect(result).toEqual({ error: 'Not authorized' })
    expect(inviteMock).not.toHaveBeenCalled()
  })
  it('returns an error when the employee is not found in the caller company', async () => {
    fromMock
      .mockReturnValueOnce(selectChain(CALLER) as never)
      .mockReturnValueOnce(selectChain(null) as never)
    const result = await inviteEmployee('emp-other-company')
    expect(result).toEqual({ error: 'Employee not found' })
    expect(inviteMock).not.toHaveBeenCalled()
  })
  it('scopes the employee lookup by id and the caller company_id', async () => {
    const target = selectChain(TARGET)
    fromMock
      .mockReturnValueOnce(selectChain(CALLER) as never)
      .mockReturnValueOnce(target as never)
      .mockReturnValueOnce(updateChain() as never)
    inviteMock.mockResolvedValue({ data: { user: { id: 'auth-new' } }, error: null } as never)
    await inviteEmployee('emp-1')
    expect(target.eq).toHaveBeenCalledWith('id', 'emp-1')
    expect(target.eq).toHaveBeenCalledWith('company_id', 'co-1')
  })
  it('returns an error when the employee is inactive', async () => {
    fromMock
      .mockReturnValueOnce(selectChain(CALLER) as never)
      .mockReturnValueOnce(selectChain({ ...TARGET, is_active: false }) as never)
    const result = await inviteEmployee('emp-1')
    expect(result).toEqual({ error: 'Employee is inactive' })
  })
  it('returns an error when the employee has no email', async () => {
    fromMock
      .mockReturnValueOnce(selectChain(CALLER) as never)
      .mockReturnValueOnce(selectChain({ ...TARGET, contact: '' }) as never)
    const result = await inviteEmployee('emp-1')
    expect(result).toEqual({ error: 'Employee has no email' })
  })
  it('returns an error when the employee is already invited', async () => {
    fromMock
      .mockReturnValueOnce(selectChain(CALLER) as never)
      .mockReturnValueOnce(selectChain({ ...TARGET, auth_user_id: 'auth-x' }) as never)
    const result = await inviteEmployee('emp-1')
    expect(result).toEqual({ error: 'Employee already invited' })
  })
  it('invites using the employee record email, points at set-password, and links the auth user', async () => {
    const update = updateChain()
    fromMock
      .mockReturnValueOnce(selectChain(CALLER) as never)
      .mockReturnValueOnce(selectChain(TARGET) as never)
      .mockReturnValueOnce(update as never)
    inviteMock.mockResolvedValue({ data: { user: { id: 'auth-new' } }, error: null } as never)
    const result = await inviteEmployee('emp-1')
    expect(inviteMock).toHaveBeenCalledWith('jane@example.com', {
      redirectTo: 'https://beforetouch.com/set-password',
    })
    expect(update.update).toHaveBeenCalledWith({ auth_user_id: 'auth-new' })
    expect(update.eq).toHaveBeenCalledWith('id', 'emp-1')
    expect(result).toEqual({ error: null })
  })
  it('returns an error when the invite call fails', async () => {
    fromMock
      .mockReturnValueOnce(selectChain(CALLER) as never)
      .mockReturnValueOnce(selectChain(TARGET) as never)
    inviteMock.mockResolvedValue({ data: null, error: { message: 'invite failed' } } as never)
    const result = await inviteEmployee('emp-1')
    expect(result).toEqual({ error: 'invite failed' })
  })
})
