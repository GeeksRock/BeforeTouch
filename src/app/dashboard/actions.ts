'use server'

import { supabase } from '@/lib/supabase'

interface Rotation {
  id: string
  employee_id: string
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
  employee_id: string
  volunteer_type: string
}

export async function fetchDashboard(userId: string): Promise<DashboardData> {
  const { data: employee, error: empError } = await supabase
    .from('employee')
    .select('id, name, company_id')
    .eq('id', userId)
    .single()
  if (empError) throw new Error(empError.message)

  const { data: rotation, error: rotError } = await supabase
    .from('rotation')
    .select('id, employee_id, start_datetime, end_datetime')
    .eq('company_id', employee.company_id)
    .eq('role', 'current')
    .single()
  if (rotError) throw new Error(rotError.message)

  if (rotation.employee_id === userId) {
    const { data: offers, error: offersError } = await supabase
      .from('volunteer_offer')
      .select('id, employee_id, volunteer_type, status, employee(name)')
      .eq('rotation_id', rotation.id)
    if (offersError) throw new Error(offersError.message)

    return {
      type: 'on-call',
      rotation,
      volunteers: (offers ?? []).map((o: { id: string; employee_id: string; volunteer_type: string; status: string; employee: { name: string }[] }) => ({
        id: o.id,
        employee_id: o.employee_id,
        employee_name: o.employee[0]?.name ?? '',
        volunteer_type: o.volunteer_type,
        status: o.status,
      })),
    }
  }

  const [onCallEmpResult, compResult] = await Promise.all([
    supabase.from('employee').select('name').eq('id', rotation.employee_id).single(),
    supabase.from('company').select('allowed_volunteer_types').eq('id', employee.company_id).single(),
  ])
  if (onCallEmpResult.error) throw new Error(onCallEmpResult.error.message)
  if (compResult.error) throw new Error(compResult.error.message)

  return {
    type: 'not-on-call',
    onCallEmployeeName: onCallEmpResult.data.name,
    rotation,
    allowedVolunteerTypes: compResult.data.allowed_volunteer_types,
  }
}

export async function submitVolunteerOffer(data: VolunteerOfferInput): Promise<void> {
  const { error } = await supabase.from('volunteer_offer').insert([{ ...data, status: 'pending' }])
  if (error) throw new Error(error.message)
}
