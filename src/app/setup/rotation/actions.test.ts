import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

const { saveRotation } = await import('./actions')

const insertMock = vi.fn()

describe('saveRotation', () => {
  const companyId = 'company-123'
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
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as never)
  })

  it('inserts two records when no backup fields provided', async () => {
    insertMock.mockResolvedValue({ error: null })

    await saveRotation({ company_id: companyId, current, next })

    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('rotation')
    expect(insertMock).toHaveBeenCalledWith([
      { company_id: companyId, on_call_employee_id: current.employee_id, backup_employee_id: null, start_datetime: current.start_datetime, end_datetime: current.end_datetime },
      { company_id: companyId, on_call_employee_id: next.employee_id, backup_employee_id: null, start_datetime: next.start_datetime, end_datetime: next.end_datetime },
    ])
  })

  it('inserts two records when backup fields are provided', async () => {
    insertMock.mockResolvedValue({ error: null })

    await saveRotation({ company_id: companyId, current, next, backup_current, backup_next })

    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('rotation')
    expect(insertMock).toHaveBeenCalledWith([
      { company_id: companyId, on_call_employee_id: current.employee_id, backup_employee_id: backup_current.employee_id, start_datetime: current.start_datetime, end_datetime: current.end_datetime },
      { company_id: companyId, on_call_employee_id: next.employee_id, backup_employee_id: backup_next.employee_id, start_datetime: next.start_datetime, end_datetime: next.end_datetime },
    ])
  })

  it('throws when supabase returns an error', async () => {
    insertMock.mockResolvedValue({ error: { message: 'insert failed' } })

    await expect(saveRotation({ company_id: companyId, current, next })).rejects.toThrow('insert failed')
  })

  it('redirects to /dashboard on success', async () => {
    insertMock.mockResolvedValue({ error: null })

    await saveRotation({ company_id: companyId, current, next })

    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/dashboard')
  })
})
