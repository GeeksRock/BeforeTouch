import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
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
  approval_approver: 'on_call' as const,
}

function makeClient(insertResult: { data: unknown; error: unknown }, userId = 'user-1') {
  const singleMock = vi.fn().mockResolvedValue(insertResult)
  const selectMock = vi.fn().mockReturnValue({ single: singleMock })
  const insertMock = vi.fn().mockReturnValue({ select: selectMock })
  const fromMock = vi.fn().mockReturnValue({ insert: insertMock })
  const getUserMock = vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } })
  return { client: { auth: { getUser: getUserMock }, from: fromMock }, insertMock, fromMock }
}

function mockRotationGroupInsert(result: { error: unknown } = { error: null }) {
  const insertMock = vi.fn().mockResolvedValue(result)
  vi.mocked(supabaseAdmin.from).mockReturnValue({ insert: insertMock } as never)
  return insertMock
}

describe('saveCompany', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts company with only name, is_active, and owner_id', async () => {
    const { client, insertMock, fromMock } = makeClient({ data: { id: 'co-1' }, error: null })
    vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never)
    mockRotationGroupInsert()

    await saveCompany(validData)

    expect(fromMock).toHaveBeenCalledWith('company')
    expect(insertMock).toHaveBeenCalledWith([{ name: validData.name, is_active: true, owner_id: 'user-1' }])
  })

  it('inserts a Default rotation_group with the rotation settings via supabaseAdmin', async () => {
    const { client } = makeClient({ data: { id: 'co-1' }, error: null })
    vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never)
    const rotationGroupInsertMock = mockRotationGroupInsert()

    await saveCompany(validData)

    expect(vi.mocked(supabaseAdmin.from)).toHaveBeenCalledWith('rotation_group')
    expect(rotationGroupInsertMock).toHaveBeenCalledWith([{
      company_id: 'co-1',
      name: 'Default',
      rotation_length: validData.rotation_length,
      rotation_start_day: validData.rotation_start_day,
      rotation_start_time: validData.rotation_start_time,
      rotation_end_day: validData.rotation_end_day,
      rotation_end_time: validData.rotation_end_time,
      has_backup: validData.has_backup,
      allowed_volunteer_types: validData.allowed_volunteer_types,
      approval_approver: validData.approval_approver,
    }])
  })

  it('throws when not authenticated', async () => {
    const { client } = makeClient({ data: null, error: null }, '')
    vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never)

    await expect(saveCompany(validData)).rejects.toThrow('Not authenticated')
  })

  it('throws when the company insert fails', async () => {
    const { client } = makeClient({ data: null, error: { message: 'insert failed' } })
    vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never)

    await expect(saveCompany(validData)).rejects.toThrow('insert failed')
  })

  it('throws when the rotation_group insert fails', async () => {
    const { client } = makeClient({ data: { id: 'co-1' }, error: null })
    vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never)
    mockRotationGroupInsert({ error: { message: 'rotation_group insert failed' } })

    await expect(saveCompany(validData)).rejects.toThrow('rotation_group insert failed')
  })
})
