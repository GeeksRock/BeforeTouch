import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

const { saveRotation, getDefaultRotationGroupHasBackup, listCompanyEmployees } = await import('./actions')

const insertMock = vi.fn()
const groupSingleMock = vi.fn()

describe('saveRotation', () => {
  const companyId = 'company-123'
  const groupId = 'group-1'
  const current = {
    employee_id: 'emp-1',
    start_datetime: '2024-01-01T09:00',
    end_datetime: '2024-01-08T09:00',
  }
  const next = {
    employee_id: 'emp-2',
    start_datetime: '2024-01-08T09:00',
    end_datetime: '2024-01-15T09:00',
  }
  const backup_current = {
    employee_id: 'emp-3',
    start_datetime: '2024-01-01T09:00',
    end_datetime: '2024-01-08T09:00',
  }
  const backup_next = {
    employee_id: 'emp-4',
    start_datetime: '2024-01-08T09:00',
    end_datetime: '2024-01-15T09:00',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    groupSingleMock.mockResolvedValue({ data: { id: groupId }, error: null })
    insertMock.mockResolvedValue({ error: null })
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'rotation_group') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ single: groupSingleMock }),
            }),
          }),
        } as never
      }
      return { insert: insertMock } as never
    })
  })

  it('inserts two records with rotation_group_id when no backup fields provided', async () => {
    await saveRotation({ company_id: companyId, current, next })

    expect(vi.mocked(supabaseAdmin.from)).toHaveBeenCalledWith('rotation')
    expect(insertMock).toHaveBeenCalledWith([
      { company_id: companyId, rotation_group_id: groupId, on_call_employee_id: current.employee_id, backup_employee_id: null, start_datetime: current.start_datetime, end_datetime: current.end_datetime },
      { company_id: companyId, rotation_group_id: groupId, on_call_employee_id: next.employee_id, backup_employee_id: null, start_datetime: next.start_datetime, end_datetime: next.end_datetime },
    ])
  })

  it('inserts two records with rotation_group_id when backup fields are provided', async () => {
    await saveRotation({ company_id: companyId, current, next, backup_current, backup_next })

    expect(vi.mocked(supabaseAdmin.from)).toHaveBeenCalledWith('rotation')
    expect(insertMock).toHaveBeenCalledWith([
      { company_id: companyId, rotation_group_id: groupId, on_call_employee_id: current.employee_id, backup_employee_id: backup_current.employee_id, start_datetime: current.start_datetime, end_datetime: current.end_datetime },
      { company_id: companyId, rotation_group_id: groupId, on_call_employee_id: next.employee_id, backup_employee_id: backup_next.employee_id, start_datetime: next.start_datetime, end_datetime: next.end_datetime },
    ])
  })

  it('throws when the rotation_group lookup errors', async () => {
    groupSingleMock.mockResolvedValue({ data: null, error: { message: 'lookup failed' } })

    await expect(saveRotation({ company_id: companyId, current, next })).rejects.toThrow('lookup failed')
  })

  it('throws when no Default rotation group exists, without falling back to null', async () => {
    groupSingleMock.mockResolvedValue({ data: null, error: null })

    await expect(saveRotation({ company_id: companyId, current, next })).rejects.toThrow('Default rotation group not found')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('throws when supabaseAdmin insert returns an error', async () => {
    insertMock.mockResolvedValue({ error: { message: 'insert failed' } })

    await expect(saveRotation({ company_id: companyId, current, next })).rejects.toThrow('insert failed')
  })

  it('redirects to /dashboard on success', async () => {
    await saveRotation({ company_id: companyId, current, next })

    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/dashboard')
  })
})

describe('getDefaultRotationGroupHasBackup', () => {
  const companyId = 'company-123'
  const singleMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    const eqMock = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: singleMock }) })
    vi.mocked(supabaseAdmin.from).mockReturnValue({ select: vi.fn().mockReturnValue({ eq: eqMock }) } as never)
  })

  it('returns has_backup from the Default rotation_group via supabaseAdmin', async () => {
    singleMock.mockResolvedValue({ data: { has_backup: true }, error: null })

    const result = await getDefaultRotationGroupHasBackup(companyId)

    expect(vi.mocked(supabaseAdmin.from)).toHaveBeenCalledWith('rotation_group')
    expect(result).toBe(true)
  })

  it('throws when the query fails', async () => {
    singleMock.mockResolvedValue({ data: null, error: { message: 'lookup failed' } })

    await expect(getDefaultRotationGroupHasBackup(companyId)).rejects.toThrow('lookup failed')
  })
})

describe('listCompanyEmployees', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })
  it('returns employees scoped to the company', async () => {
    const eqMock = vi.fn().mockResolvedValue({
      data: [{ id: 'emp-1', name: 'Ana' }],
      error: null,
    })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    vi.mocked(supabaseAdmin.from).mockReturnValue({ select: selectMock } as never)
    const result = await listCompanyEmployees('company-123')
    expect(vi.mocked(supabaseAdmin.from)).toHaveBeenCalledWith('employee')
    expect(eqMock).toHaveBeenCalledWith('company_id', 'company-123')
    expect(result).toEqual([{ id: 'emp-1', name: 'Ana' }])
  })
  it('throws when the query fails', async () => {
    const eqMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'query failed' } })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    vi.mocked(supabaseAdmin.from).mockReturnValue({ select: selectMock } as never)
    await expect(listCompanyEmployees('company-123')).rejects.toThrow('query failed')
  })
})
