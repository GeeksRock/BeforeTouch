import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

const { saveCompany } = await import('./actions')

const insertMock = vi.fn()

describe('saveCompany', () => {
  const validData = {
    name: 'Test Co',
    rotation_length: '7',
    rotation_start_day: 'Monday',
    rotation_start_time: '09:00',
    rotation_end_day: 'Friday',
    rotation_end_time: '17:00',
    has_backup: false,
    allowed_volunteer_types: ['full-time'],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as never)
  })

  it('calls supabase insert with correct data', async () => {
    insertMock.mockResolvedValue({ error: null })

    await saveCompany(validData)

    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('company')
    expect(insertMock).toHaveBeenCalledWith([validData])
  })

  it('throws when supabase returns an error', async () => {
    insertMock.mockResolvedValue({ error: { message: 'insert failed' } })

    await expect(saveCompany(validData)).rejects.toThrow('insert failed')
  })
})
