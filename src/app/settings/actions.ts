'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface RotationGroupSummary {
  id: string
  name: string
}

export async function fetchRotationGroups(): Promise<{ data: RotationGroupSummary[] | null; error: string | null }> {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }
  const { data: employee, error: empError } = await client
    .from('employee')
    .select('company_id')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (empError) return { data: null, error: empError.message }
  if (!employee) return { data: null, error: 'Employee record not found' }
  const { data: groups, error: groupError } = await supabaseAdmin
    .from('rotation_group')
    .select('id, name')
    .eq('company_id', employee.company_id)
  if (groupError) return { data: null, error: groupError.message }
  return { data: groups as RotationGroupSummary[], error: null }
}

export interface RotationGroupForm {
  name: string
  rotation_length: string
  rotation_start_day: string
  rotation_start_time: string
  has_backup: boolean
  allowed_volunteer_types: string[]
  approval_approver: 'on_call' | 'manager'
}
export async function createRotationGroup(data: RotationGroupForm): Promise<{ error: string | null }> {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: employee, error: empError } = await client
    .from('employee')
    .select('company_id')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (empError) return { error: empError.message }
  if (!employee) return { error: 'Employee record not found' }
  const { error: insertError } = await supabaseAdmin
    .from('rotation_group')
    .insert([{ ...data, company_id: employee.company_id }])
  if (insertError) return { error: insertError.message }
  return { error: null }
}

export async function fetchRotationGroup(id: string): Promise<{ data: RotationGroupForm | null; error: string | null }> {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }
  const { data: employee, error: empError } = await client
    .from('employee')
    .select('company_id')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (empError) return { data: null, error: empError.message }
  if (!employee) return { data: null, error: 'Employee record not found' }
  const { data: group, error: groupError } = await supabaseAdmin
    .from('rotation_group')
    .select('name, rotation_length, rotation_start_day, rotation_start_time, has_backup, allowed_volunteer_types, approval_approver')
    .eq('id', id)
    .eq('company_id', employee.company_id)
    .maybeSingle()
  if (groupError) return { data: null, error: groupError.message }
  if (!group) return { data: null, error: 'Rotation group not found' }
  return { data: group as RotationGroupForm, error: null }
}

export async function updateRotationGroup(id: string, data: RotationGroupForm): Promise<{ error: string | null }> {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: employee, error: empError } = await client
    .from('employee')
    .select('company_id')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (empError) return { error: empError.message }
  if (!employee) return { error: 'Employee record not found' }
  const { error: updateError } = await supabaseAdmin
    .from('rotation_group')
    .update(data)
    .eq('id', id)
    .eq('company_id', employee.company_id)
  if (updateError) return { error: updateError.message }
  return { error: null }
}

export interface RosterMember {
  employee_id: string
  position: number
  name: string
}

export async function fetchRotationGroupRoster(id: string): Promise<{ data: RosterMember[] | null; error: string | null }> {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }
  const { data: employee, error: empError } = await client
    .from('employee')
    .select('company_id')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (empError) return { data: null, error: empError.message }
  if (!employee) return { data: null, error: 'Employee record not found' }
  const { data: group, error: groupError } = await supabaseAdmin
    .from('rotation_group')
    .select('id')
    .eq('id', id)
    .eq('company_id', employee.company_id)
    .maybeSingle()
  if (groupError) return { data: null, error: groupError.message }
  if (!group) return { data: null, error: 'Rotation group not found' }
  const { data: rows, error: rosterError } = await supabaseAdmin
    .from('employee_rotation_group')
    .select('employee_id, position, employee(name)')
    .eq('rotation_group_id', id)
    .order('position', { ascending: true })
  if (rosterError) return { data: null, error: rosterError.message }
  const roster = (rows as unknown as { employee_id: string; position: number; employee: { name: string } }[]).map(
    (row) => ({ employee_id: row.employee_id, position: row.position, name: row.employee.name }),
  )
  return { data: roster, error: null }
}

export interface AvailableEmployee {
  id: string
  name: string
}

export async function fetchAvailableEmployees(groupId: string): Promise<{ data: AvailableEmployee[] | null; error: string | null }> {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }
  const { data: employee, error: empError } = await client
    .from('employee')
    .select('company_id')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (empError) return { data: null, error: empError.message }
  if (!employee) return { data: null, error: 'Employee record not found' }
  const { data: group, error: groupError } = await supabaseAdmin
    .from('rotation_group')
    .select('id')
    .eq('id', groupId)
    .eq('company_id', employee.company_id)
    .maybeSingle()
  if (groupError) return { data: null, error: groupError.message }
  if (!group) return { data: null, error: 'Rotation group not found' }
  const { data: members, error: memberError } = await supabaseAdmin
    .from('employee_rotation_group')
    .select('employee_id')
    .eq('rotation_group_id', groupId)
  if (memberError) return { data: null, error: memberError.message }
  const { data: employees, error: listError } = await supabaseAdmin
    .from('employee')
    .select('id, name')
    .eq('company_id', employee.company_id)
    .eq('is_active', true)
    .order('name', { ascending: true })
  if (listError) return { data: null, error: listError.message }
  const taken = new Set((members as { employee_id: string }[]).map((m) => m.employee_id))
  const available = (employees as AvailableEmployee[]).filter((e) => !taken.has(e.id))
  return { data: available, error: null }
}
