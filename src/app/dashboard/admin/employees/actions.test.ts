import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

const { listEmployees, updateEmployee, addEmployee, bulkAddEmployees, deleteEmployee } = await import('./actions')

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
      from: fromMock,
    } as never)
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
  const eqMock = vi.fn()
  const updateMock = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    updateMock.mockReturnValue({ eq: eqMock })
    vi.mocked(supabaseAdmin.from).mockReturnValue({ update: updateMock } as never)
  })

  it('updates the given employee with the provided fields', async () => {
    eqMock.mockResolvedValue({ error: null })

    const result = await updateEmployee('emp-1', { name: 'New Name' })

    expect(vi.mocked(supabaseAdmin.from)).toHaveBeenCalledWith('employee')
    expect(updateMock).toHaveBeenCalledWith({ name: 'New Name' })
    expect(eqMock).toHaveBeenCalledWith('id', 'emp-1')
    expect(result).toEqual({ error: null })
  })

  it('returns the error when the update fails', async () => {
    eqMock.mockResolvedValue({ error: { message: 'update failed' } })

    const result = await updateEmployee('emp-1', { is_active: false })

    expect(result).toEqual({ error: 'update failed' })
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
      from: fromMock,
    } as never)
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
    vi.mocked(supabaseAdmin.from).mockReturnValue({ insert: mockInsertEmployee({ id: 'emp-9' }) } as never)

    const result = await addEmployee(validForm)

    expect(vi.mocked(supabaseAdmin.from)).toHaveBeenCalledWith('employee')
    expect(result).toEqual({ data: { id: 'emp-9' }, error: null })
  })

  it('returns the insert error when it fails', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    fromMock.mockReturnValueOnce({ select: mockCompanyLookup({ id: 'company-1' }) })
    vi.mocked(supabaseAdmin.from).mockReturnValue({ insert: mockInsertEmployee(null, { message: 'insert failed' }) } as never)

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
      from: fromMock,
    } as never)
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
    vi.mocked(supabaseAdmin.from).mockReturnValue({ insert: insertMock } as never)

    const result = await bulkAddEmployees(rows)

    expect(vi.mocked(supabaseAdmin.from)).toHaveBeenCalledWith('employee')
    expect(insertMock).toHaveBeenCalledWith(rows.map(r => ({ ...r, company_id: 'company-1' })))
    expect(result).toEqual({ data: { count: 2 }, error: null })
  })

  it('returns the insert error when it fails', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    fromMock.mockReturnValueOnce({ select: mockCompanyLookup({ id: 'company-1' }) })
    const insertMock = vi.fn().mockResolvedValue({ error: { message: 'bulk insert failed' } })
    vi.mocked(supabaseAdmin.from).mockReturnValue({ insert: insertMock } as never)

    const result = await bulkAddEmployees(rows)

    expect(result).toEqual({ data: null, error: 'bulk insert failed' })
  })
})

describe('deleteEmployee', () => {
  const eqMock = vi.fn()
  const deleteMock = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    deleteMock.mockReturnValue({ eq: eqMock })
    vi.mocked(supabaseAdmin.from).mockReturnValue({ delete: deleteMock } as never)
  })

  it('deletes the employee by id', async () => {
    eqMock.mockResolvedValue({ error: null })

    const result = await deleteEmployee('emp-1')

    expect(vi.mocked(supabaseAdmin.from)).toHaveBeenCalledWith('employee')
    expect(deleteMock).toHaveBeenCalled()
    expect(eqMock).toHaveBeenCalledWith('id', 'emp-1')
    expect(result).toEqual({ error: null })
  })

  it('returns the error when delete fails', async () => {
    eqMock.mockResolvedValue({ error: { message: 'delete failed' } })

    const result = await deleteEmployee('emp-1')

    expect(result).toEqual({ error: 'delete failed' })
  })
})
