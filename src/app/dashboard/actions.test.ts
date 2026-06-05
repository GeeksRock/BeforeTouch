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

const { fetchDashboard, submitVolunteerOffer, approveVolunteerOffer } = await import('./actions')

// Creates a mock that is both chainable (.select, .eq, .limit, .update, etc.) and
// directly awaitable (for queries that end with .eq or .update(...).eq(...)).
function makeQueryBuilder(data: unknown, error: unknown = null) {
  const result = { data, error }
  const builder: Record<string, unknown> = {
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  builder.eq = vi.fn().mockReturnValue(builder)
  builder.select = vi.fn().mockReturnValue(builder)
  builder.limit = vi.fn().mockReturnValue(builder)
  builder.lte = vi.fn().mockReturnValue(builder)
  builder.gte = vi.fn().mockReturnValue(builder)
  builder.order = vi.fn().mockReturnValue(builder)
  builder.update = vi.fn().mockReturnValue(builder)
  return builder
}

const userId = 'emp-1'
const employee = { id: 'emp-1', name: 'Alice', company_id: 'co-1', is_admin: false }
const adminEmployee = { id: 'emp-1', name: 'Alice', company_id: 'co-1', is_admin: true }
const rotation = {
  id: 'rot-1',
  on_call_employee_id: 'emp-1',
  start_datetime: '2024-01-01T09:00',
  end_datetime: '2024-01-08T09:00',
}
const volunteers = [
  {
    id: 'vo-1',
    volunteer_employee_id: 'emp-2',
    offer_type: 'full_shift',
    status: 'pending',
    employee: { name: 'Bob' },
  },
]
const otherRotation = { ...rotation, on_call_employee_id: 'emp-2' }
const onCallEmployee = { name: 'Bob' }
const company = { allowed_volunteer_types: ['full_shift', 'partial_day'], approval_approver: 'on_call' }

function mockAuthAs(id: string | null) {
  const getUserMock = vi.fn().mockResolvedValue({
    data: { user: id ? { id } : null },
    error: null,
  })
  vi.mocked(createSupabaseServerClient).mockReturnValue(
    Promise.resolve({
      auth: { getUser: getUserMock },
      from: supabase.from,
    }) as never,
  )
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
        .mockReturnValueOnce(makeQueryBuilder(volunteers) as never)   // volunteer_offer (parallel)
        .mockReturnValueOnce(makeQueryBuilder({ approval_approver: 'on_call' }) as never)  // company (parallel)
    })

    it('returns type on-call', async () => {
      const result = await fetchDashboard()
      expect(result.data?.type).toBe('on-call')
    })

    it('includes the rotation slot', async () => {
      const result = await fetchDashboard()
      if (result.data?.type !== 'on-call') throw new Error('wrong type')
      expect(result.data.rotation).toEqual(rotation)
    })

    it('includes mapped volunteer offers', async () => {
      const result = await fetchDashboard()
      if (result.data?.type !== 'on-call') throw new Error('wrong type')
      expect(result.data.volunteers).toEqual([
        {
          id: 'vo-1',
          employee_id: 'emp-2',
          employee_name: 'Bob',
          volunteer_type: 'full_shift',
          status: 'pending',
        },
      ])
    })

    it('includes approval_approver', async () => {
      const result = await fetchDashboard()
      if (result.data?.type !== 'on-call') throw new Error('wrong type')
      expect(result.data.approval_approver).toBe('on_call')
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
        .mockReturnValueOnce(makeQueryBuilder(null) as never)   // volunteer_offer
        .mockReturnValueOnce(makeQueryBuilder({ approval_approver: 'on_call' }) as never)  // company
    })

    it('returns an empty volunteers array', async () => {
      const result = await fetchDashboard()
      if (result.data?.type !== 'on-call') throw new Error('wrong type')
      expect(result.data.volunteers).toEqual([])
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
      expect(result.data?.type).toBe('not-on-call')
    })

    it('includes the on-call employee name', async () => {
      const result = await fetchDashboard()
      if (result.data?.type !== 'not-on-call') throw new Error('wrong type')
      expect(result.data.onCallEmployeeName).toBe('Bob')
    })

    it('includes the rotation slot', async () => {
      const result = await fetchDashboard()
      if (result.data?.type !== 'not-on-call') throw new Error('wrong type')
      expect(result.data.rotation).toEqual(otherRotation)
    })

    it('includes the company allowed_volunteer_types', async () => {
      const result = await fetchDashboard()
      if (result.data?.type !== 'not-on-call') throw new Error('wrong type')
      expect(result.data.allowedVolunteerTypes).toEqual(['full_shift', 'partial_day'])
    })

    it('includes approval_approver', async () => {
      const result = await fetchDashboard()
      if (result.data?.type !== 'not-on-call') throw new Error('wrong type')
      expect(result.data.approval_approver).toBe('on_call')
    })

    it('queries the company table', async () => {
      await fetchDashboard()
      expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('company')
    })
  })

  describe('when the employee is an admin', () => {
    beforeEach(() => {
      mockAuthAs(userId)
      vi.mocked(supabase.from)
        .mockReturnValueOnce(makeQueryBuilder(adminEmployee) as never)
        .mockReturnValueOnce(makeQueryBuilder(rotation) as never)
        .mockReturnValueOnce(makeQueryBuilder(volunteers) as never)   // volunteer_offer (parallel)
        .mockReturnValueOnce(makeQueryBuilder({ approval_approver: 'on_call' }) as never)  // company (parallel)
    })

    it('returns type admin', async () => {
      const result = await fetchDashboard()
      expect(result.data?.type).toBe('admin')
    })

    it('includes the rotation', async () => {
      const result = await fetchDashboard()
      if (result.data?.type !== 'admin') throw new Error('wrong type')
      expect(result.data.rotation).toEqual(rotation)
    })

    it('includes mapped volunteer offers', async () => {
      const result = await fetchDashboard()
      if (result.data?.type !== 'admin') throw new Error('wrong type')
      expect(result.data.volunteers).toEqual([
        {
          id: 'vo-1',
          employee_id: 'emp-2',
          employee_name: 'Bob',
          volunteer_type: 'full_shift',
          status: 'pending',
        },
      ])
    })

    it('includes approval_approver', async () => {
      const result = await fetchDashboard()
      if (result.data?.type !== 'admin') throw new Error('wrong type')
      expect(result.data.approval_approver).toBe('on_call')
    })
  })

  describe('error handling', () => {
    it('returns an error when not authenticated', async () => {
      mockAuthAs(null)
      const result = await fetchDashboard()
      expect(result.error).toBe('Not authenticated')
    })

    it('returns an error when the employee query fails', async () => {
      mockAuthAs(userId)
      vi.mocked(supabase.from).mockReturnValueOnce(
        makeQueryBuilder(null, { message: 'employee not found' }) as never,
      )
      const result = await fetchDashboard()
      expect(result.error).toBe('employee not found')
    })

    it('returns an error when the rotation query fails', async () => {
      mockAuthAs(userId)
      vi.mocked(supabase.from)
        .mockReturnValueOnce(makeQueryBuilder(employee) as never)
        .mockReturnValueOnce(makeQueryBuilder(null, { message: 'rotation not found' }) as never)
      const result = await fetchDashboard()
      expect(result.error).toBe('rotation not found')
    })

    it('returns an error when the volunteer_offer query fails for an on-call user', async () => {
      mockAuthAs(userId)
      vi.mocked(supabase.from)
        .mockReturnValueOnce(makeQueryBuilder(employee) as never)
        .mockReturnValueOnce(makeQueryBuilder(rotation) as never)
        .mockReturnValueOnce(makeQueryBuilder(null, { message: 'offers query failed' }) as never)
        .mockReturnValueOnce(makeQueryBuilder({ approval_approver: 'on_call' }) as never)
      const result = await fetchDashboard()
      expect(result.error).toBe('offers query failed')
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
        volunteer_employee_id: userId,
        offer_type: 'full_shift',
        status: 'pending',
      },
    ])
  })

  it('returns an error when not authenticated', async () => {
    mockAuthAs(null)
    const result = await submitVolunteerOffer({ rotation_id: 'rot-1', volunteer_type: 'full_shift' })
    expect(result.error).toBe('Not authenticated')
  })

  it('returns an error when the insert fails', async () => {
    insertMock.mockResolvedValue({ error: { message: 'insert failed' } })

    const result = await submitVolunteerOffer({ rotation_id: 'rot-1', volunteer_type: 'full_shift' })
    expect(result.error).toBe('insert failed')
  })
})

describe('approveVolunteerOffer', () => {
  const approvalInsertMock = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    mockAuthAs(userId)
    approvalInsertMock.mockResolvedValue({ error: null })
    vi.mocked(supabase.from)
      .mockReturnValueOnce(makeQueryBuilder({ id: 'emp-1' }) as never)   // employee lookup
      .mockReturnValueOnce({ insert: approvalInsertMock } as never)       // approval insert
      .mockReturnValueOnce(makeQueryBuilder(null) as never)               // volunteer_offer update
  })

  it('inserts into the approval table with correct fields', async () => {
    await approveVolunteerOffer({ offer_id: 'offer-1', decision: 'accepted' })
    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('approval')
    expect(approvalInsertMock).toHaveBeenCalledWith([
      expect.objectContaining({
        volunteer_offer_id: 'offer-1',
        approver_employee_id: 'emp-1',
        decision: 'accepted',
        decided_at: expect.any(String),
      }),
    ])
  })

  it('updates volunteer_offer status', async () => {
    await approveVolunteerOffer({ offer_id: 'offer-1', decision: 'accepted' })
    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('volunteer_offer')
  })

  it('returns null error on success', async () => {
    const result = await approveVolunteerOffer({ offer_id: 'offer-1', decision: 'accepted' })
    expect(result.error).toBeNull()
  })

  it('returns an error when not authenticated', async () => {
    mockAuthAs(null)
    const result = await approveVolunteerOffer({ offer_id: 'offer-1', decision: 'accepted' })
    expect(result.error).toBe('Not authenticated')
  })

  it('returns an error when employee record not found', async () => {
    vi.resetAllMocks()
    mockAuthAs(userId)
    vi.mocked(supabase.from).mockReturnValueOnce(makeQueryBuilder(null) as never)
    const result = await approveVolunteerOffer({ offer_id: 'offer-1', decision: 'accepted' })
    expect(result.error).toBe('Employee record not found')
  })

  it('returns an error when the approval insert fails', async () => {
    vi.resetAllMocks()
    mockAuthAs(userId)
    vi.mocked(supabase.from)
      .mockReturnValueOnce(makeQueryBuilder({ id: 'emp-1' }) as never)
      .mockReturnValueOnce({ insert: vi.fn().mockResolvedValue({ error: { message: 'insert failed' } }) } as never)
    const result = await approveVolunteerOffer({ offer_id: 'offer-1', decision: 'accepted' })
    expect(result.error).toBe('insert failed')
  })

  it('returns an error when the status update fails', async () => {
    vi.resetAllMocks()
    mockAuthAs(userId)
    vi.mocked(supabase.from)
      .mockReturnValueOnce(makeQueryBuilder({ id: 'emp-1' }) as never)
      .mockReturnValueOnce({ insert: vi.fn().mockResolvedValue({ error: null }) } as never)
      .mockReturnValueOnce(makeQueryBuilder(null, { message: 'update failed' }) as never)
    const result = await approveVolunteerOffer({ offer_id: 'offer-1', decision: 'accepted' })
    expect(result.error).toBe('update failed')
  })
})
