import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

const { listEmployees, updateEmployee } = await import('./actions')

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
