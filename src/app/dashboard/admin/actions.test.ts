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

import { fetchAdminDashboard } from './actions'

describe('fetchAdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
  })

  it('returns the company state', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'company') return builder({ id: 'co-1', name: 'Acme HVAC', state: 'setup' })
      if (table === 'rotation') return builder(null)
      if (table === 'employee') return builder([])
      throw new Error(`unexpected table: ${table}`)
    })

    const { data, error } = await fetchAdminDashboard()

    expect(error).toBeNull()
    expect(data!.company.state).toBe('setup')
  })

  it('returns an error when not authenticated', async () => {
    mockAuth.mockResolvedValue({ data: { user: null } })

    const { data, error } = await fetchAdminDashboard()

    expect(data).toBeNull()
    expect(error).toBe('Not authenticated')
  })

  it('returns an error when the account owns no company', async () => {
    mockFrom.mockImplementation(() => builder(null))

    const { data, error } = await fetchAdminDashboard()

    expect(data).toBeNull()
    expect(error).toBe('No company found for this account')
  })

  it('returns the soonest upcoming rotation for each group', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'company') return builder({ id: 'co-1', name: 'Acme HVAC', state: 'live' })
      if (table === 'rotation') return builder([
        { id: 'r-2', on_call_employee_id: 'e-2', start_datetime: '2026-08-17T13:00:00+00:00', end_datetime: '2026-08-24T13:00:00+00:00', rotation_group_id: 'g-1', rotation_group: { name: 'Service' } },
        { id: 'r-1', on_call_employee_id: 'e-1', start_datetime: '2026-08-10T13:00:00+00:00', end_datetime: '2026-08-17T13:00:00+00:00', rotation_group_id: 'g-1', rotation_group: { name: 'Service' } },
        { id: 'r-3', on_call_employee_id: 'e-3', start_datetime: '2026-08-10T11:00:00+00:00', end_datetime: '2026-09-07T11:00:00+00:00', rotation_group_id: 'g-2', rotation_group: { name: 'Install' } },
      ])
      if (table === 'employee') return builder([
        { id: 'e-1', name: 'Ana', is_active: true },
        { id: 'e-3', name: 'Cy', is_active: true },
      ])
      throw new Error(`unexpected table: ${table}`)
    })
    const { data } = await fetchAdminDashboard()
    expect(data!.rotations).toHaveLength(2)
    expect(data!.rotations[0]).toMatchObject({
      group_name: 'Install',
      on_call_employee_name: 'Cy',
      id: 'r-3',
    })
    expect(data!.rotations[1]).toMatchObject({
      group_name: 'Service',
      on_call_employee_name: 'Ana',
      id: 'r-1',
    })
  })
  it('returns an empty list when no rotations exist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'company') return builder({ id: 'co-1', name: 'Acme HVAC', state: 'setup' })
      if (table === 'rotation') return builder([])
      if (table === 'employee') return builder([])
      throw new Error(`unexpected table: ${table}`)
    })
    const { data } = await fetchAdminDashboard()
    expect(data!.rotations).toEqual([])
  })
})

function builder(data: unknown) {
  const chain: Record<string, unknown> = {}
  let projected: unknown = data
  for (const m of ['eq', 'order', 'limit', 'lte', 'gte']) chain[m] = () => chain
  chain.select = (cols: string) => { projected = project(data, cols); return chain }
  chain.maybeSingle = async () => ({ data: projected, error: null })
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: projected, error: null })
  return chain
}

function splitCols(cols: string): string[] {
  const out: string[] = []
  let depth = 0
  let current = ''
  for (const ch of cols) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) { out.push(current); current = ''; continue }
    current += ch
  }
  if (current.trim()) out.push(current)
  return out.map((c) => c.trim())
}

function project(data: unknown, cols: string): unknown {
  if (data === null) return null
  const keys = splitCols(cols).map((c) => c.replace(/\(.*\)$/, '').trim())
  const pick = (row: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(row).filter(([k]) => keys.includes(k)))
  if (Array.isArray(data)) return data.map((r) => pick(r as Record<string, unknown>))
  return pick(data as Record<string, unknown>)
}
