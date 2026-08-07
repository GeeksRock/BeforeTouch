import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockAuth, mockFrom } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mockAuth },
    from: mockFrom,
  }),
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: mockFrom },
}))

import { goLive } from './go-live'

describe('goLive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
  })

  it('refuses when a rotation group has too few members', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'employee') return builder({ company_id: 'co-1' })
      if (table === 'company') return builder({ id: 'co-1', state: 'setup', timezone: 'America/Chicago' })
      if (table === 'rotation_group') return builder([
        { id: 'g-1', name: 'Service', rotation_length: '1_week', rotation_start_time: '08:00:00', has_backup: false, employee_rotation_group: [{ employee_id: 'e-1', position: 1 }] },
      ])
      throw new Error(`unexpected table: ${table}`)
    })

    const result = await goLive('2026-08-10')

    expect(result.error).toContain('Service')
  })

  it('inserts rotations for every group and flips state to live', async () => {
    const inserted: unknown[] = []
    const updates: unknown[] = []

    mockFrom.mockImplementation((table: string) => {
      if (table === 'employee') return builder({ company_id: 'co-1' })
      if (table === 'company') {
        const chain = builder({ id: 'co-1', state: 'setup', timezone: 'America/Chicago' }) as Record<string, unknown>
        chain.update = (payload: unknown) => { updates.push(payload); return chain }
        return chain
      }
      if (table === 'rotation_group') return builder([
        { id: 'g-1', name: 'Service', rotation_length: '1_week', rotation_start_time: '08:00:00', has_backup: false, employee_rotation_group: [{ employee_id: 'e-2', position: 2 }, { employee_id: 'e-1', position: 1 }] },
        { id: 'g-2', name: 'Install', rotation_length: '2_weeks', rotation_start_time: '07:00:00', has_backup: false, employee_rotation_group: [{ employee_id: 'e-3', position: 1 }, { employee_id: 'e-4', position: 2 }] },
      ])
      if (table === 'rotation') {
        return { insert: async (rows: unknown[]) => { inserted.push(...rows); return { error: null } } }
      }
      throw new Error(`unexpected table: ${table}`)
    })

    const result = await goLive('2026-08-10')

    expect(result.error).toBeNull()
    expect(updates).toEqual([{ state: 'live' }])
    expect(inserted).toHaveLength(4)
    expect(inserted[0]).toMatchObject({
      company_id: 'co-1',
      rotation_group_id: 'g-1',
      on_call_employee_id: 'e-1',
      start_datetime: '2026-08-10T13:00:00.000Z',
    })
    expect(inserted[2]).toMatchObject({ rotation_group_id: 'g-2', on_call_employee_id: 'e-3' })
  })
})

function builder(data: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'order', 'limit']
  for (const m of methods) chain[m] = () => chain
  chain.maybeSingle = async () => ({ data, error: null })
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data, error: null })
  return chain
}
