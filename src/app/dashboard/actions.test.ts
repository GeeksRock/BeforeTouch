import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase'
import { createSupabaseServerClient } from '@/lib/supabase-server'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

const { fetchDashboard, submitVolunteerOffer } = await import('./actions')

// Creates a mock that is both chainable (.select, .eq, .single) and
// directly awaitable (for list queries that end with .eq).
function makeQueryBuilder(data: unknown, error: unknown = null) {
  const result = { data, error }
  const builder: Record<string, unknown> = {
    single: vi.fn().mockResolvedValue(result),
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  builder.eq = vi.fn().mockReturnValue(builder)
  builder.select = vi.fn().mockReturnValue(builder)
  return builder
}

const userId = 'emp-1'
const employee = { id: 'emp-1', name: 'Alice', company_id: 'co-1' }
const rotation = {
  id: 'rot-1',
  employee_id: 'emp-1',
  start_datetime: '2024-01-01T09:00',
  end_datetime: '2024-01-08T09:00',
}
const volunteers = [
  {
    id: 'vo-1',
    employee_id: 'emp-2',
    volunteer_type: 'full_shift',
    status: 'pending',
    employee: [{ name: 'Bob' }],
  },
]
const otherRotation = { ...rotation, employee_id: 'emp-2' }
const onCallEmployee = { name: 'Bob' }
const company = { allowed_volunteer_types: ['full_shift', 'partial_day'] }

function mockAuthAs(id: string | null) {
  const getUserMock = vi.fn().mockResolvedValue({
    data: { user: id ? { id } : null },
    error: null,
  })
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: { getUser: getUserMock },
  } as never)
}

describe('fetchDashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('when the current user is on call', () => {
    beforeEach(() => {
      mockAuthAs(userId)
      vi.mocked(supabase.from)
        .mockReturnValueOnce(makeQueryBuilder(employee) as never)
        .mockReturnValueOnce(makeQueryBuilder(rotation) as never)
        .mockReturnValueOnce(makeQueryBuilder(volunteers) as never)
    })

    it('returns type on-call', async () => {
      const result = await fetchDashboard()
      expect(result.type).toBe('on-call')
    })

    it('includes the rotation slot', async () => {
      const result = await fetchDashboard()
      if (result.type !== 'on-call') throw new Error('wrong type')
      expect(result.rotation).toEqual(rotation)
    })

    it('includes mapped volunteer offers', async () => {
      const result = await fetchDashboard()
      if (result.type !== 'on-call') throw new Error('wrong type')
      expect(result.volunteers).toEqual([
        {
          id: 'vo-1',
          employee_id: 'emp-2',
          employee_name: 'Bob',
          volunteer_type: 'full_shift',
          status: 'pending',
        },
      ])
    })

    it('queries the rotation table', async () => {
      await fetchDashboard()
      expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('rotation')
    })

    it('queries volunteer_offer for the rotation', async () => {
      await fetchDashboard()
      expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('volunteer_offer')
    })
  })

  describe('when the current user is on call with no volunteer offers', () => {
    beforeEach(() => {
      mockAuthAs(userId)
      vi.mocked(supabase.from)
        .mockReturnValueOnce(makeQueryBuilder(employee) as never)
        .mockReturnValueOnce(makeQueryBuilder(rotation) as never)
        .mockReturnValueOnce(makeQueryBuilder(null) as never)
    })

    it('returns an empty volunteers array', async () => {
      const result = await fetchDashboard()
      if (result.type !== 'on-call') throw new Error('wrong type')
      expect(result.volunteers).toEqual([])
    })
  })

  describe('when the current user is not on call', () => {
    beforeEach(() => {
      mockAuthAs(userId)
      vi.mocked(supabase.from)
        .mockReturnValueOnce(makeQueryBuilder(employee) as never)
        .mockReturnValueOnce(makeQueryBuilder(otherRotation) as never)
        .mockReturnValueOnce(makeQueryBuilder(onCallEmployee) as never)
        .mockReturnValueOnce(makeQueryBuilder(company) as never)
    })

    it('returns type not-on-call', async () => {
      const result = await fetchDashboard()
      expect(result.type).toBe('not-on-call')
    })

    it('includes the on-call employee name', async () => {
      const result = await fetchDashboard()
      if (result.type !== 'not-on-call') throw new Error('wrong type')
      expect(result.onCallEmployeeName).toBe('Bob')
    })

    it('includes the rotation slot', async () => {
      const result = await fetchDashboard()
      if (result.type !== 'not-on-call') throw new Error('wrong type')
      expect(result.rotation).toEqual(otherRotation)
    })

    it('includes the company allowed_volunteer_types', async () => {
      const result = await fetchDashboard()
      if (result.type !== 'not-on-call') throw new Error('wrong type')
      expect(result.allowedVolunteerTypes).toEqual(['full_shift', 'partial_day'])
    })

    it('queries the company table', async () => {
      await fetchDashboard()
      expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('company')
    })
  })

  describe('error handling', () => {
    it('throws when not authenticated', async () => {
      mockAuthAs(null)
      await expect(fetchDashboard()).rejects.toThrow('Not authenticated')
    })

    it('throws when the employee query fails', async () => {
      mockAuthAs(userId)
      vi.mocked(supabase.from).mockReturnValueOnce(
        makeQueryBuilder(null, { message: 'employee not found' }) as never,
      )
      await expect(fetchDashboard()).rejects.toThrow('employee not found')
    })

    it('throws when the rotation query fails', async () => {
      mockAuthAs(userId)
      vi.mocked(supabase.from)
        .mockReturnValueOnce(makeQueryBuilder(employee) as never)
        .mockReturnValueOnce(makeQueryBuilder(null, { message: 'rotation not found' }) as never)
      await expect(fetchDashboard()).rejects.toThrow('rotation not found')
    })

    it('throws when the volunteer_offer query fails for an on-call user', async () => {
      mockAuthAs(userId)
      vi.mocked(supabase.from)
        .mockReturnValueOnce(makeQueryBuilder(employee) as never)
        .mockReturnValueOnce(makeQueryBuilder(rotation) as never)
        .mockReturnValueOnce(makeQueryBuilder(null, { message: 'offers query failed' }) as never)
      await expect(fetchDashboard()).rejects.toThrow('offers query failed')
    })
  })
})

describe('submitVolunteerOffer', () => {
  const insertMock = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    mockAuthAs(userId)
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as never)
  })

  it('inserts a volunteer offer with the session user id and pending status', async () => {
    insertMock.mockResolvedValue({ error: null })

    await submitVolunteerOffer({ rotation_id: 'rot-1', volunteer_type: 'full_shift' })

    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('volunteer_offer')
    expect(insertMock).toHaveBeenCalledWith([
      {
        rotation_id: 'rot-1',
        employee_id: userId,
        volunteer_type: 'full_shift',
        status: 'pending',
      },
    ])
  })

  it('throws when not authenticated', async () => {
    mockAuthAs(null)
    await expect(
      submitVolunteerOffer({ rotation_id: 'rot-1', volunteer_type: 'full_shift' }),
    ).rejects.toThrow('Not authenticated')
  })

  it('throws when the insert fails', async () => {
    insertMock.mockResolvedValue({ error: { message: 'insert failed' } })

    await expect(
      submitVolunteerOffer({ rotation_id: 'rot-1', volunteer_type: 'full_shift' }),
    ).rejects.toThrow('insert failed')
  })
})
