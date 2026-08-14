import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { inviteEmployee } from '@/app/setup/employees/actions'

vi.mock('@/app/setup/employees/actions', () => ({
  inviteEmployee: vi.fn(),
}))
vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    auth: { admin: { inviteUserByEmail: vi.fn() } },
  },
}))

const { listEmployees, updateEmployee, addEmployee, bulkAddEmployees, bulkInviteEmployees, deleteEmployee } = await import('./actions')

function mockCompanyLookup(company: { id: string } | null, error: { message: string } | null = null) {
  const maybeSingleMock = vi.fn().mockResolvedValue({ data: company, error })
  const limitMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
  const eqMock = vi.fn().mockReturnValue({ limit: limitMock })
  return vi.fn().mockReturnValue({ eq: eqMock })
}

function mockEmployeeQuery(rows: unknown[] | null, error: { message: string } | null = null) {
  const orderMock = vi.fn().mockResolvedValue({ data: rows, error })
  const eqMock = vi.fn().mockReturnValue({ order: orderMock })
  return vi.fn().mockReturnValue({ eq: eqMock })
}

describe('listEmployees', () => {
  const getUserMock = vi.fn()
  const fromMock = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: getUserMock },
    } as never)
    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never)
  })

  it('returns an error when not authenticated', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })

    const result = await listEmployees()

    expect(result).toEqual({ data: null, error: 'Not authenticated' })
  })

  it('returns an error when no company is found', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    fromMock.mockReturnValueOnce({ select: mockCompanyLookup(null) })

    const result = await listEmployees()

    expect(result).toEqual({ data: null, error: 'No company found for this account' })
  })

  it("returns employees for the user's company, ordered by name", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    fromMock.mockReturnValueOnce({ select: mockCompanyLookup({ id: 'company-1' }) })
    const rows = [{ id: 'e1', name: 'Alice', contact: 'a@x.com', can_volunteer: true, can_receive_volunteers: true, is_active: true }]
    fromMock.mockReturnValueOnce({ select: mockEmployeeQuery(rows) })

    const result = await listEmployees()

    expect(fromMock).toHaveBeenCalledWith('employee')
    expect(result).toEqual({ data: rows, error: null })
  })

  it('returns the employee query error when it fails', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    fromMock.mockReturnValueOnce({ select: mockCompanyLookup({ id: 'company-1' }) })
    fromMock.mockReturnValueOnce({ select: mockEmployeeQuery(null, { message: 'query failed' }) })

    const result = await listEmployees()

    expect(result).toEqual({ data: null, error: 'query failed' })
  })
})

describe('updateEmployee', () => {
  const selectAfterUpdate = vi.fn()
  const updateEqMock = vi.fn()
  const updateMock = vi.fn()
  const callerRow = { id: 'emp-caller', company_id: 'co-1', is_admin: true }

  function mockUpdateChain(result: { data: unknown[] | null; error: { message: string } | null }) {
    selectAfterUpdate.mockResolvedValue(result)
    updateEqMock.mockReturnValue({ eq: updateEqMock, select: selectAfterUpdate })
    updateMock.mockReturnValue({ eq: updateEqMock })
  }

  function mockCaller(caller: typeof callerRow | null = callerRow) {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'auth-caller' } } }) },
    } as never)
    vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: caller, error: null }),
    } as never)
  }

  function mockAdminList(admins: { id: string }[]) {
    const adminBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
        Promise.resolve({ data: admins, error: null }).then(res, rej),
    }
    vi.mocked(supabaseAdmin.from).mockReturnValueOnce(adminBuilder as never)
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(supabaseAdmin.from).mockReturnValue({ update: updateMock } as never)
  })

  it('returns an error when the caller is not an admin', async () => {
    mockCaller({ ...callerRow, is_admin: false })
    const result = await updateEmployee('emp-1', { name: 'New Name' })
    expect(result).toEqual({ error: 'Not authorized' })
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('updates scoped by id and company_id', async () => {
    mockCaller()
    mockUpdateChain({ data: [{ id: 'emp-1' }], error: null })
    const result = await updateEmployee('emp-1', { name: 'New Name' })
    expect(updateMock).toHaveBeenCalledWith({ name: 'New Name' })
    expect(updateEqMock).toHaveBeenCalledWith('id', 'emp-1')
    expect(updateEqMock).toHaveBeenCalledWith('company_id', 'co-1')
    expect(result).toEqual({ error: null })
  })

  it('returns the error when the update fails', async () => {
    mockCaller()
    mockUpdateChain({ data: null, error: { message: 'update failed' } })
    const result = await updateEmployee('emp-1', { name: 'New Name' })
    expect(result).toEqual({ error: 'update failed' })
  })

  it('returns an error when no employee matches id and company', async () => {
    mockCaller()
    mockUpdateChain({ data: [], error: null })
    const result = await updateEmployee('emp-other-co', { name: 'New Name' })
    expect(result).toEqual({ error: 'Employee not found' })
  })

  it('returns an error when an admin deactivates themself', async () => {
    mockCaller()
    const result = await updateEmployee('emp-caller', { is_active: false })
    expect(result).toEqual({ error: 'You cannot deactivate yourself' })
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('returns an error when deactivating the last active admin', async () => {
    mockCaller()
    mockAdminList([{ id: 'emp-1' }])
    const result = await updateEmployee('emp-1', { is_active: false })
    expect(result).toEqual({ error: 'Cannot deactivate the last active admin' })
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('allows deactivating an admin when another active admin remains', async () => {
    mockCaller()
    mockAdminList([{ id: 'emp-caller' }, { id: 'emp-1' }])
    mockUpdateChain({ data: [{ id: 'emp-1' }], error: null })
    const result = await updateEmployee('emp-1', { is_active: false })
    expect(updateMock).toHaveBeenCalledWith({ is_active: false })
    expect(result).toEqual({ error: null })
  })

  it('skips the admin-list query for updates that do not deactivate', async () => {
    mockCaller()
    mockUpdateChain({ data: [{ id: 'emp-1' }], error: null })
    const result = await updateEmployee('emp-1', { is_active: true })
    expect(vi.mocked(supabaseAdmin.from)).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ error: null })
  })
})
function mockInsertEmployee(result: { id: string } | null, error: { message: string } | null = null) {
  const maybeSingleMock = vi.fn().mockResolvedValue({ data: result, error })
  const limitMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
  const selectMock = vi.fn().mockReturnValue({ limit: limitMock })
  return vi.fn().mockReturnValue({ select: selectMock })
}

describe('addEmployee', () => {
  const getUserMock = vi.fn()
  const fromMock = vi.fn()

  const validForm = {
    name: 'Bob',
    contact: 'bob@x.com',
    can_volunteer: true,
    can_receive_volunteers: true,
    is_active: true,
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: getUserMock },
    } as never)
    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never)
  })

  it('returns an error when not authenticated', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })

    const result = await addEmployee(validForm)

    expect(result).toEqual({ data: null, error: 'Not authenticated' })
  })

  it('returns an error when no company is found', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    fromMock.mockReturnValueOnce({ select: mockCompanyLookup(null) })

    const result = await addEmployee(validForm)

    expect(result).toEqual({ data: null, error: 'No company found for this account' })
  })

  it("inserts the employee for the user's company", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    fromMock.mockReturnValueOnce({ select: mockCompanyLookup({ id: 'company-1' }) })
    fromMock.mockReturnValueOnce({ insert: mockInsertEmployee({ id: 'emp-9' }) })

    const result = await addEmployee(validForm)

    expect(vi.mocked(supabaseAdmin.from)).toHaveBeenCalledWith('employee')
    expect(result).toEqual({ data: { id: 'emp-9' }, error: null })
  })

  it('returns the insert error when it fails', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    fromMock.mockReturnValueOnce({ select: mockCompanyLookup({ id: 'company-1' }) })
    fromMock.mockReturnValueOnce({ insert: mockInsertEmployee(null, { message: 'insert failed' }) })

    const result = await addEmployee(validForm)

    expect(result).toEqual({ data: null, error: 'insert failed' })
  })
})

describe('bulkAddEmployees', () => {
  const getUserMock = vi.fn()
  const fromMock = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: getUserMock },
    } as never)
    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never)
  })

  const rows = [
    { name: 'Alice', contact: 'alice@x.com', can_volunteer: true, can_receive_volunteers: true, is_active: true },
    { name: 'Bob', contact: 'bob@x.com', can_volunteer: false, can_receive_volunteers: true, is_active: true },
  ]

  it('returns a count of 0 without touching the database for an empty list', async () => {
    const result = await bulkAddEmployees([])

    expect(result).toEqual({ data: { count: 0 }, error: null })
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('returns an error when not authenticated', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })

    const result = await bulkAddEmployees(rows)

    expect(result).toEqual({ data: null, error: 'Not authenticated' })
  })

  it('returns an error when no company is found', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    fromMock.mockReturnValueOnce({ select: mockCompanyLookup(null) })

    const result = await bulkAddEmployees(rows)

    expect(result).toEqual({ data: null, error: 'No company found for this account' })
  })

  it('inserts all rows tagged with the company id', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    fromMock.mockReturnValueOnce({ select: mockCompanyLookup({ id: 'company-1' }) })
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    fromMock.mockReturnValueOnce({ insert: insertMock })

    const result = await bulkAddEmployees(rows)

    expect(vi.mocked(supabaseAdmin.from)).toHaveBeenCalledWith('employee')
    expect(insertMock).toHaveBeenCalledWith(rows.map(r => ({ ...r, company_id: 'company-1' })))
    expect(result).toEqual({ data: { count: 2 }, error: null })
  })

  it('returns the insert error when it fails', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    fromMock.mockReturnValueOnce({ select: mockCompanyLookup({ id: 'company-1' }) })
    const insertMock = vi.fn().mockResolvedValue({ error: { message: 'bulk insert failed' } })
    fromMock.mockReturnValueOnce({ insert: insertMock })

    const result = await bulkAddEmployees(rows)

    expect(result).toEqual({ data: null, error: 'bulk insert failed' })
  })
})

describe('bulkInviteEmployees', () => {
  const inviteMock = vi.mocked(inviteEmployee)
  beforeEach(() => {
    vi.resetAllMocks()
  })
  it('partitions results into invited and failed', async () => {
    inviteMock
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: 'Employee already invited' })
      .mockResolvedValueOnce({ error: null })
    const result = await bulkInviteEmployees(['e-1', 'e-2', 'e-3'])
    expect(result.invited).toEqual(['e-1', 'e-3'])
    expect(result.failed).toEqual([{ id: 'e-2', error: 'Employee already invited' }])
    expect(inviteMock).toHaveBeenCalledTimes(3)
  })
  it('invites each employee by id only', async () => {
    inviteMock.mockResolvedValue({ error: null })
    await bulkInviteEmployees(['e-1', 'e-2'])
    expect(inviteMock).toHaveBeenCalledWith('e-1')
    expect(inviteMock).toHaveBeenCalledWith('e-2')
  })
})
describe('deleteEmployee', () => {
  const eqMock = vi.fn()
  const deleteMock = vi.fn()
  const selectAfterDelete = vi.fn()
  const callerRow = { id: 'emp-caller', company_id: 'co-1', is_admin: true }
  function mockCaller(caller: typeof callerRow | null = callerRow) {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'auth-caller' } } }) },
    } as never)
    vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: caller, error: null }),
    } as never)
  }
  function mockDeleteChain(result: { data: unknown[] | null; error: { message: string } | null }) {
    selectAfterDelete.mockResolvedValue(result)
    eqMock.mockReturnValue({ eq: eqMock, select: selectAfterDelete })
    deleteMock.mockReturnValue({ eq: eqMock })
  }
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(supabaseAdmin.from).mockReturnValue({ delete: deleteMock } as never)
  })
  it('throws when not authenticated', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)
    await expect(deleteEmployee('emp-1')).rejects.toThrow('Not authenticated')
    expect(deleteMock).not.toHaveBeenCalled()
  })
  it('throws when the caller has no employee record', async () => {
    mockCaller(null)
    await expect(deleteEmployee('emp-1')).rejects.toThrow('Employee record not found')
    expect(deleteMock).not.toHaveBeenCalled()
  })
  it('returns an error when the caller is not an admin', async () => {
    mockCaller({ ...callerRow, is_admin: false })
    const result = await deleteEmployee('emp-1')
    expect(result).toEqual({ error: 'Not authorized' })
    expect(deleteMock).not.toHaveBeenCalled()
  })
  it('deletes scoped by id and company_id', async () => {
    mockCaller()
    mockDeleteChain({ data: [{ id: 'emp-1' }], error: null })
    const result = await deleteEmployee('emp-1')
    expect(vi.mocked(supabaseAdmin.from)).toHaveBeenCalledWith('employee')
    expect(eqMock).toHaveBeenCalledWith('id', 'emp-1')
    expect(eqMock).toHaveBeenCalledWith('company_id', 'co-1')
    expect(result).toEqual({ error: null })
  })
  it('returns an error when no employee matches id and company', async () => {
    mockCaller()
    mockDeleteChain({ data: [], error: null })
    const result = await deleteEmployee('emp-other-co')
    expect(result).toEqual({ error: 'Employee not found' })
  })
  it('returns the error when delete fails', async () => {
    mockCaller()
    mockDeleteChain({ data: null, error: { message: 'delete failed' } })
    const result = await deleteEmployee('emp-1')
    expect(result).toEqual({ error: 'delete failed' })
  })
})
