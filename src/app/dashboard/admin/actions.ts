'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'

export interface AdminDashboardData {
  company: { id: string; name: string }
  rotation: {
    id: string
    on_call_employee_id: string
    on_call_employee_name: string
    start_datetime: string
    end_datetime: string
  } | null
  employees: { id: string; name: string; is_active: boolean }[]
}

export async function fetchAdminDashboard(): Promise<{ data: AdminDashboardData | null; error: string | null }> {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  console.log('[fetchAdminDashboard] user.id:', user?.id)
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data: company, error: compError } = await client
    .from('company')
    .select('id, name')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()
  if (compError) return { data: null, error: compError.message }
  if (!company) return { data: null, error: 'No company found for this account' }

  const [rotResult, empResult] = await Promise.all([
    client
      .from('rotation')
      .select('id, on_call_employee_id, start_datetime, end_datetime')
      .eq('company_id', company.id)
      .lte('start_datetime', new Date().toISOString())
      .gte('end_datetime', new Date().toISOString())
      .order('start_datetime', { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from('employee')
      .select('id, name, is_active')
      .eq('company_id', company.id)
      .order('name'),
  ])

  if (rotResult.error) return { data: null, error: rotResult.error.message }
  if (empResult.error) return { data: null, error: empResult.error.message }

  const employees = empResult.data ?? []

  let rotation: AdminDashboardData['rotation'] = null
  if (rotResult.data) {
    const onCallEmployee = employees.find(e => e.id === rotResult.data!.on_call_employee_id)
    rotation = {
      ...rotResult.data,
      on_call_employee_name: onCallEmployee?.name ?? 'Unknown',
    }
  }

  return { data: { company, rotation, employees }, error: null }
}
