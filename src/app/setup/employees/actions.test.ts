import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

const { saveEmployee } = await import('./actions')

const insertMock = vi.fn()

describe('saveEmployee', () => {
  const validData = {
    name: 'Jane Doe',
    contact: 'jane@example.com',
    can_volunteer: true,
    can_receive_volunteers: true,
    company_id: 'company-123',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as never)
  })

  it('calls supabase insert with correct data', async () => {
    insertMock.mockResolvedValue({ error: null })

    await saveEmployee(validData)

    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('employee')
    expect(insertMock).toHaveBeenCalledWith([validData])
  })

  it('throws when supabase returns an error', async () => {
    insertMock.mockResolvedValue({ error: { message: 'insert failed' } })

    await expect(saveEmployee(validData)).rejects.toThrow('insert failed')
  })
})
