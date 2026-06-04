import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseServerClient } from '@/lib/supabase-server'

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

const { saveCompany } = await import('./actions')

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

function makeClient(insertResult: { data: unknown; error: unknown }, userId = 'user-1') {
  const singleMock = vi.fn().mockResolvedValue(insertResult)
  const selectMock = vi.fn().mockReturnValue({ single: singleMock })
  const insertMock = vi.fn().mockReturnValue({ select: selectMock })
  const fromMock = vi.fn().mockReturnValue({ insert: insertMock })
  const getUserMock = vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } })
  return { client: { auth: { getUser: getUserMock }, from: fromMock }, insertMock, fromMock }
}

describe('saveCompany', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts company with owner_id from the authenticated user', async () => {
    const { client, insertMock, fromMock } = makeClient({ data: { id: 'co-1' }, error: null })
    vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never)

    await saveCompany(validData)

    expect(fromMock).toHaveBeenCalledWith('company')
    expect(insertMock).toHaveBeenCalledWith([{ ...validData, owner_id: 'user-1' }])
  })

  it('throws when not authenticated', async () => {
    const { client } = makeClient({ data: null, error: null }, '')
    vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never)

    await expect(saveCompany(validData)).rejects.toThrow('Not authenticated')
  })

  it('throws when the insert fails', async () => {
    const { client } = makeClient({ data: null, error: { message: 'insert failed' } })
    vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never)

    await expect(saveCompany(validData)).rejects.toThrow('insert failed')
  })
})
