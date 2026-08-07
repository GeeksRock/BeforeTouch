import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: mockFrom },
}))

import { regenerateRotations } from './regenerate-rotations'

const GROUP = {
  id: 'g-1',
  rotation_length: '1_week',
  rotation_start_time: '08:00:00',
  has_backup: false,
  company: { timezone: 'America/Chicago' },
  employee_rotation_group: [
    { employee_id: 'e-1', position: 1 },
    { employee_id: 'e-2', position: 2 },
    { employee_id: 'e-3', position: 3 },
  ],
}

describe('regenerateRotations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does nothing while the current rotation is still running', async () => {
    const inserted: unknown[] = []
    mockFrom.mockImplementation((table: string) => {
      if (table === 'rotation_group') return chain([GROUP])
      if (table === 'rotation') return rotationChain([
        { id: 'r-1', on_call_employee_id: 'e-1', start_datetime: '2026-08-10T13:00:00+00:00', end_datetime: '2026-08-17T13:00:00+00:00', rotation_group_id: 'g-1' },
        { id: 'r-2', on_call_employee_id: 'e-2', start_datetime: '2026-08-17T13:00:00+00:00', end_datetime: '2026-08-24T13:00:00+00:00', rotation_group_id: 'g-1' },
      ], inserted)
      throw new Error(`unexpected table: ${table}`)
    })

    const result = await regenerateRotations(new Date('2026-08-12T00:00:00Z'))
    expect(result.regenerated).toBe(0)
    expect(inserted).toHaveLength(0)
  })

  it('regenerates from the next period when the current one has ended', async () => {
    const inserted: unknown[] = []
    mockFrom.mockImplementation((table: string) => {
      if (table === 'rotation_group') return chain([GROUP])
      if (table === 'rotation') return rotationChain([
        { id: 'r-1', on_call_employee_id: 'e-1', start_datetime: '2026-08-10T13:00:00+00:00', end_datetime: '2026-08-17T13:00:00+00:00', rotation_group_id: 'g-1' },
        { id: 'r-2', on_call_employee_id: 'e-2', start_datetime: '2026-08-17T13:00:00+00:00', end_datetime: '2026-08-24T13:00:00+00:00', rotation_group_id: 'g-1' },
      ], inserted)
      throw new Error(`unexpected table: ${table}`)
    })

    const result = await regenerateRotations(new Date('2026-08-18T00:00:00Z'))
    expect(result.regenerated).toBe(1)
    expect(inserted).toHaveLength(2)
    expect(inserted[0]).toMatchObject({ on_call_employee_id: 'e-2', rotation_group_id: 'g-1' })
    expect(inserted[1]).toMatchObject({ on_call_employee_id: 'e-3' })
  })
})

function chain(data: unknown) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order', 'gte', 'lte']) c[m] = () => c
  c.then = (resolve: (v: unknown) => unknown) => resolve({ data, error: null })
  return c
}

function rotationChain(data: unknown[], inserted: unknown[]) {
  const c = chain(data) as Record<string, unknown>
  c.delete = () => c
  c.insert = async (rows: unknown[]) => { inserted.push(...rows); return { error: null } }
  return c
}
