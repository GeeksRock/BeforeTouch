'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface AdminDashboardData {
  company: { id: string; name: string; state: string }
  rotations: {
    id: string
    on_call_employee_id: string
    start_datetime: string
    end_datetime: string
    group_name: string
    on_call_employee_name: string
  }[]
  employees: { id: string; name: string; is_active: boolean }[]
}

export async function fetchAdminDashboard(): Promise<{ data: AdminDashboardData | null; error: string | null }> {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data: caller } = await supabaseAdmin
    .from('employee')
    .select('id, company_id, is_admin')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (!caller) return { data: null, error: 'Employee record not found' }
  if (!caller.is_admin) return { data: null, error: 'Not authorized' }
  const { data: company } = await supabaseAdmin
    .from('company')
    .select('id, name, state')
    .eq('id', caller.company_id)
    .limit(1)
    .maybeSingle()
  if (!company) return { data: null, error: 'Company not found' }

  const [rotResult, empResult] = await Promise.all([
    supabaseAdmin
      .from('rotation')
      .select('id, on_call_employee_id, start_datetime, end_datetime, rotation_group_id, rotation_group(name)')
      .eq('company_id', company.id)
      .gte('end_datetime', new Date().toISOString())
      .order('start_datetime', { ascending: true }),
    supabaseAdmin
      .from('employee')
      .select('id, name, is_active')
      .eq('company_id', company.id)
      .order('name'),
  ])

  if (rotResult.error) return { data: null, error: rotResult.error.message }
  if (empResult.error) return { data: null, error: empResult.error.message }

  const employees = empResult.data ?? []
  const rotRows = (rotResult.data ?? []) as unknown as {
    id: string
    on_call_employee_id: string
    start_datetime: string
    end_datetime: string
    rotation_group_id: string
    rotation_group: { name: string }
  }[]

  const soonestByGroup = new Map<string, (typeof rotRows)[number]>()
  for (const row of rotRows) {
    const existing = soonestByGroup.get(row.rotation_group_id)
    if (!existing || row.start_datetime < existing.start_datetime) {
      soonestByGroup.set(row.rotation_group_id, row)
    }
  }

  const rotations = [...soonestByGroup.values()]
    .map(row => ({
      id: row.id,
      on_call_employee_id: row.on_call_employee_id,
      start_datetime: row.start_datetime,
      end_datetime: row.end_datetime,
      group_name: row.rotation_group.name,
      on_call_employee_name:
        employees.find(e => e.id === row.on_call_employee_id)?.name ?? 'Unknown',
    }))
    .sort((a, b) => a.group_name.localeCompare(b.group_name))

  return { data: { company, rotations, employees }, error: null }
}
