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
  ownerName: 'Michelle E',
}

interface ClientOverrides {
  companyResult?: { data: unknown; error: unknown }
  employeeResult?: { error: unknown }
  userId?: string
  userEmail?: string | null
}

function useClient({
  companyResult = { data: { id: 'co-1' }, error: null },
  employeeResult = { error: null },
  userId = 'user-1',
  userEmail = 'owner@example.com',
}: ClientOverrides = {}) {
  const companySingle = vi.fn().mockResolvedValue(companyResult)
  const companySelect = vi.fn().mockReturnValue({ single: companySingle })
  const companyInsert = vi.fn().mockReturnValue({ select: companySelect })
  const employeeInsert = vi.fn().mockResolvedValue(employeeResult)

  const fromMock = vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
    if (table === 'company') return { insert: companyInsert }
    if (table === 'employee') return { insert: employeeInsert }
    throw new Error(`unexpected table: ${table}`)
  }) as never)

  const getUserMock = vi.fn().mockResolvedValue({
    data: { user: userId ? { id: userId, email: userEmail } : null },
  })

  const client = { auth: { getUser: getUserMock } }
  vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never)

  return { companyInsert, employeeInsert, fromMock }
}

describe('saveCompany', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts company with name, owner_id, and state', async () => {
    const { companyInsert, fromMock } = useClient()
    await saveCompany(validData)
    expect(fromMock).toHaveBeenCalledWith('company')
    expect(companyInsert).toHaveBeenCalledWith([
      { name: validData.name, owner_id: 'user-1', state: 'setup' },
    ])
  })

  it('inserts an admin employee row for the owner', async () => {
    const { employeeInsert, fromMock } = useClient()
    await saveCompany(validData)
    expect(fromMock).toHaveBeenCalledWith('employee')
    expect(employeeInsert).toHaveBeenCalledWith([
      {
        company_id: 'co-1',
        name: validData.ownerName,
        contact: 'owner@example.com',
        auth_user_id: 'user-1',
        is_admin: true,
        is_active: true,
        can_volunteer: false,
        can_receive_volunteers: false,
      },
    ])
  })

  it('throws when not authenticated', async () => {
    useClient({ userId: '' })
    await expect(saveCompany(validData)).rejects.toThrow('Not authenticated')
  })

  it('throws when the authenticated user has no email address', async () => {
    useClient({ userEmail: null })
    await expect(saveCompany(validData)).rejects.toThrow('Authenticated user has no email address')
  })

  it('throws when the company insert fails', async () => {
    useClient({ companyResult: { data: null, error: { message: 'insert failed' } } })
    await expect(saveCompany(validData)).rejects.toThrow('insert failed')
  })

  it('does not insert an employee when the company insert fails', async () => {
    const { employeeInsert } = useClient({
      companyResult: { data: null, error: { message: 'insert failed' } },
    })
    await expect(saveCompany(validData)).rejects.toThrow('insert failed')
    expect(employeeInsert).not.toHaveBeenCalled()
  })

  it('throws when the employee insert fails', async () => {
    useClient({ employeeResult: { error: { message: 'employee insert failed' } } })
    await expect(saveCompany(validData)).rejects.toThrow('employee insert failed')
  })
})
