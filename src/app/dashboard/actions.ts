'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'

interface Rotation {
  id: string
  on_call_employee_id: string
  start_datetime: string
  end_datetime: string
}

interface VolunteerOffer {
  id: string
  employee_id: string
  employee_name: string
  volunteer_type: string
  status: string
}

export type DashboardData =
  | { type: 'on-call'; rotation: Rotation; volunteers: VolunteerOffer[] }
  | { type: 'not-on-call'; onCallEmployeeName: string; rotation: Rotation; allowedVolunteerTypes: string[] }

export interface VolunteerOfferInput {
  rotation_id: string
  volunteer_type: string
}

async function getAuthenticatedUserId(): Promise<string> {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function fetchDashboard(): Promise<{ data: DashboardData | null; error: string | null }> {
  let userId: string
  try {
    userId = await getAuthenticatedUserId()
  } catch (e: any) {
    return { data: null, error: e.message ?? 'Not authenticated' }
  }

  const client = await createSupabaseServerClient()

  const { data: employee, error: empError } = await client
    .from('employee')
    .select('id, name, company_id')
    .eq('auth_user_id', userId)
    .limit(1)
    .maybeSingle()
  if (empError) return { data: null, error: empError.message }
  if (!employee) return { data: null, error: 'Employee record not found' }

  const { data: rotation, error: rotError } = await client
    .from('rotation')
    .select('id, on_call_employee_id, start_datetime, end_datetime')
    .eq('company_id', employee.company_id)
    .lte('start_datetime', new Date().toISOString())
    .gte('end_datetime', new Date().toISOString())
    .order('start_datetime', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (rotError) return { data: null, error: rotError.message }
  if (!rotation) return { data: null, error: 'No active rotation found' }

  if (rotation.on_call_employee_id === employee.id) {
    const { data: offers, error: offersError } = await client
      .from('volunteer_offer')
      .select('id, volunteer_employee_id, offer_type, status, employee(name)')
      .eq('rotation_id', rotation.id)
    if (offersError) return { data: null, error: offersError.message }

    return {
      data: {
        type: 'on-call',
        rotation,
        volunteers: (offers ?? []).map((o: any) => ({
          id: o.id,
          employee_id: o.volunteer_employee_id,
          employee_name: o.employee?.name ?? '',
          volunteer_type: o.offer_type,
          status: o.status,
        })),
      },
      error: null,
    }
  }

  const [onCallEmpResult, compResult] = await Promise.all([
    client.from('employee').select('name').eq('id', rotation.on_call_employee_id).single(),
    client.from('company').select('allowed_volunteer_types').eq('id', employee.company_id).single(),
  ])
  if (onCallEmpResult.error) return { data: null, error: onCallEmpResult.error.message }
  if (compResult.error) return { data: null, error: compResult.error.message }

  return {
    data: {
      type: 'not-on-call',
      onCallEmployeeName: onCallEmpResult.data.name,
      rotation,
      allowedVolunteerTypes: compResult.data.allowed_volunteer_types,
    },
    error: null,
  }
}

export async function submitVolunteerOffer(data: VolunteerOfferInput): Promise<{ error: string | null }> {
  let userId: string
  try {
    userId = await getAuthenticatedUserId()
  } catch (e: any) {
    return { error: e.message ?? 'Not authenticated' }
  }
  const client = await createSupabaseServerClient()
  const { error } = await client.from('volunteer_offer').insert([{
    rotation_id: data.rotation_id,
    volunteer_employee_id: userId,
    offer_type: data.volunteer_type,
    status: 'pending',
  }])
  if (error) return { error: error.message }
  return { error: null }
}
