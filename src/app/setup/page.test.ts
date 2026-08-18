import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
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
const { default: SetupPage } = await import('./page')
interface ClientOverrides {
  employeeResult?: { data: unknown; error: unknown }
  userId?: string
}
function useClient({
  employeeResult = { data: null, error: null },
  userId = 'user-1',
}: ClientOverrides = {}) {
  const employeeMaybeSingle = vi.fn().mockResolvedValue(employeeResult)
  const employeeEq = vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ maybeSingle: employeeMaybeSingle }) })
  const employeeSelect = vi.fn().mockReturnValue({ eq: employeeEq })
  const fromMock = vi.mocked(supabaseAdmin.from).mockReturnValue({ select: employeeSelect } as never)
  const getUserMock = vi.fn().mockResolvedValue({
    data: { user: userId ? { id: userId } : null },
  })
  const client = { auth: { getUser: getUserMock } }
  vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never)
  return { fromMock, employeeEq }
}
describe('SetupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('throws when not authenticated', async () => {
    useClient({ userId: '' })
    await expect(SetupPage()).rejects.toThrow('Not authenticated')
  })
  it('redirects to the dashboard when the caller has an employee record', async () => {
    const { fromMock, employeeEq } = useClient({ employeeResult: { data: { id: 'emp-1' }, error: null } })
    await SetupPage()
    expect(fromMock).toHaveBeenCalledWith('employee')
    expect(employeeEq).toHaveBeenCalledWith('auth_user_id', 'user-1')
    expect(redirect).toHaveBeenCalledWith('/dashboard/admin')
  })
  it('shows the form when the caller has no employee record', async () => {
    useClient({ employeeResult: { data: null, error: null } })
    await SetupPage()
    expect(redirect).not.toHaveBeenCalled()
  })
})
