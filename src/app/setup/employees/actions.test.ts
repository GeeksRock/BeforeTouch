import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabaseAdmin } from '@/lib/supabase-admin'

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    auth: { admin: { inviteUserByEmail: vi.fn() } },
  },
}))

const { saveEmployee, inviteEmployee } = await import('./actions')

describe('saveEmployee', () => {
  const insertMock = vi.fn()
  const singleMock = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    insertMock.mockReturnValue({ select: selectMock })
    vi.mocked(supabaseAdmin.from).mockReturnValue({ insert: insertMock } as never)
  })

  const validData = {
    name: 'Jane Doe',
    contact: 'jane@example.com',
    can_volunteer: true,
    can_receive_volunteers: true,
    company_id: 'company-123',
    is_active: true,
  }

  it('calls supabase insert with all fields including is_active', async () => {
    singleMock.mockResolvedValue({ data: { id: 'new-id' }, error: null })

    await saveEmployee(validData)

    expect(vi.mocked(supabaseAdmin.from)).toHaveBeenCalledWith('employee')
    expect(insertMock).toHaveBeenCalledWith([validData])
  })

  it('saves is_active: false when specified', async () => {
    singleMock.mockResolvedValue({ data: { id: 'new-id' }, error: null })

    await saveEmployee({ ...validData, is_active: false })

    expect(insertMock).toHaveBeenCalledWith([{ ...validData, is_active: false }])
  })

  it('returns the id of the newly created employee', async () => {
    singleMock.mockResolvedValue({ data: { id: 'new-emp-id' }, error: null })

    const result = await saveEmployee(validData)

    expect(result).toEqual({ id: 'new-emp-id' })
  })

  it('throws when supabase returns an error', async () => {
    singleMock.mockResolvedValue({ data: null, error: { message: 'insert failed' } })

    await expect(saveEmployee(validData)).rejects.toThrow('insert failed')
  })
})

describe('inviteEmployee', () => {
  const inviteMock = vi.mocked(supabaseAdmin.auth.admin.inviteUserByEmail)
  const updateMock = vi.fn()
  const eqMock = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    updateMock.mockReturnValue({ eq: eqMock })
    vi.mocked(supabaseAdmin.from).mockReturnValue({ update: updateMock } as never)
  })

  it('calls inviteUserByEmail with the given email', async () => {
    inviteMock.mockResolvedValue({ data: { user: { id: 'auth-uuid-1' } }, error: null } as never)
    eqMock.mockResolvedValue({ error: null })

    await inviteEmployee('emp-1', 'jane@example.com')

    expect(inviteMock).toHaveBeenCalledWith('jane@example.com')
  })

  it('updates the employee record with the returned auth_user_id', async () => {
    inviteMock.mockResolvedValue({ data: { user: { id: 'auth-uuid-1' } }, error: null } as never)
    eqMock.mockResolvedValue({ error: null })

    await inviteEmployee('emp-1', 'jane@example.com')

    expect(vi.mocked(supabaseAdmin.from)).toHaveBeenCalledWith('employee')
    expect(updateMock).toHaveBeenCalledWith({ auth_user_id: 'auth-uuid-1' })
    expect(eqMock).toHaveBeenCalledWith('id', 'emp-1')
  })

  it('throws when the invite call fails', async () => {
    inviteMock.mockResolvedValue({ data: null, error: { message: 'invite failed' } } as never)

    await expect(inviteEmployee('emp-1', 'jane@example.com')).rejects.toThrow('invite failed')
  })

  it('throws when the employee update fails', async () => {
    inviteMock.mockResolvedValue({ data: { user: { id: 'auth-uuid-1' } }, error: null } as never)
    eqMock.mockResolvedValue({ error: { message: 'update failed' } })

    await expect(inviteEmployee('emp-1', 'jane@example.com')).rejects.toThrow('update failed')
  })
})
