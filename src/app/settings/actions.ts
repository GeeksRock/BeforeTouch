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
  const { data: employee, error: empError } = await supabaseAdmin
    .from('employee')
    .select('company_id, is_admin')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (empError) return { data: null, error: empError.message }
  if (!employee) return { data: null, error: 'Employee record not found' }
  if (!employee.is_admin) return { data: null, error: 'Not authorized' }
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
  const { data: employee, error: empError } = await supabaseAdmin
    .from('employee')
    .select('company_id, is_admin')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (empError) return { error: empError.message }
  if (!employee) return { error: 'Employee record not found' }
  if (!employee.is_admin) return { error: 'Not authorized' }
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
  const { data: employee, error: empError } = await supabaseAdmin
    .from('employee')
    .select('company_id, is_admin')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (empError) return { data: null, error: empError.message }
  if (!employee) return { data: null, error: 'Employee record not found' }
  if (!employee.is_admin) return { data: null, error: 'Not authorized' }
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
  const { data: employee, error: empError } = await supabaseAdmin
    .from('employee')
    .select('company_id, is_admin')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (empError) return { error: empError.message }
  if (!employee) return { error: 'Employee record not found' }
  if (!employee.is_admin) return { error: 'Not authorized' }
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
  const { data: employee, error: empError } = await supabaseAdmin
    .from('employee')
    .select('company_id, is_admin')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (empError) return { data: null, error: empError.message }
  if (!employee) return { data: null, error: 'Employee record not found' }
  if (!employee.is_admin) return { data: null, error: 'Not authorized' }
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
  const { data: employee, error: empError } = await supabaseAdmin
    .from('employee')
    .select('company_id, is_admin')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (empError) return { data: null, error: empError.message }
  if (!employee) return { data: null, error: 'Employee record not found' }
  if (!employee.is_admin) return { data: null, error: 'Not authorized' }
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

export async function addRotationGroupMember(groupId: string, employeeId: string): Promise<{ error: string | null }> {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: caller, error: callerError } = await supabaseAdmin
    .from('employee')
    .select('company_id, is_admin')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (callerError) return { error: callerError.message }
  if (!caller) return { error: 'Employee record not found' }
  if (!caller.is_admin) return { error: 'Not authorized' }
  const { data: group, error: groupError } = await supabaseAdmin
    .from('rotation_group')
    .select('id')
    .eq('id', groupId)
    .eq('company_id', caller.company_id)
    .maybeSingle()
  if (groupError) return { error: groupError.message }
  if (!group) return { error: 'Rotation group not found' }
  const { data: target, error: targetError } = await supabaseAdmin
    .from('employee')
    .select('id')
    .eq('id', employeeId)
    .eq('company_id', caller.company_id)
    .eq('is_active', true)
    .maybeSingle()
  if (targetError) return { error: targetError.message }
  if (!target) return { error: 'Employee not found' }
  const { data: last, error: lastError } = await supabaseAdmin
    .from('employee_rotation_group')
    .select('position')
    .eq('rotation_group_id', groupId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (lastError) return { error: lastError.message }
  const position = last ? (last as { position: number }).position + 1 : 1
  const { error: insertError } = await supabaseAdmin
    .from('employee_rotation_group')
    .insert([{ rotation_group_id: groupId, employee_id: employeeId, position }])
  if (insertError) return { error: insertError.message }
  return { error: null }
}

export async function removeRotationGroupMember(groupId: string, employeeId: string): Promise<{ error: string | null }> {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: caller, error: callerError } = await supabaseAdmin
    .from('employee')
    .select('company_id, is_admin')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (callerError) return { error: callerError.message }
  if (!caller) return { error: 'Employee record not found' }
  if (!caller.is_admin) return { error: 'Not authorized' }
  const { data: group, error: groupError } = await supabaseAdmin
    .from('rotation_group')
    .select('id')
    .eq('id', groupId)
    .eq('company_id', caller.company_id)
    .maybeSingle()
  if (groupError) return { error: groupError.message }
  if (!group) return { error: 'Rotation group not found' }
  const { error: deleteError } = await supabaseAdmin
    .from('employee_rotation_group')
    .delete()
    .eq('rotation_group_id', groupId)
    .eq('employee_id', employeeId)
  if (deleteError) return { error: deleteError.message }
  return { error: null }
}
export async function moveRotationGroupMember(groupId: string, employeeId: string, direction: 'up' | 'down'): Promise<{ error: string | null }> {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: caller, error: callerError } = await supabaseAdmin
    .from('employee')
    .select('company_id, is_admin')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (callerError) return { error: callerError.message }
  if (!caller) return { error: 'Employee record not found' }
  if (!caller.is_admin) return { error: 'Not authorized' }
  const { data: group, error: groupError } = await supabaseAdmin
    .from('rotation_group')
    .select('id')
    .eq('id', groupId)
    .eq('company_id', caller.company_id)
    .maybeSingle()
  if (groupError) return { error: groupError.message }
  if (!group) return { error: 'Rotation group not found' }
  const { data: rows, error: rowsError } = await supabaseAdmin
    .from('employee_rotation_group')
    .select('employee_id, position')
    .eq('rotation_group_id', groupId)
    .order('position', { ascending: true })
  if (rowsError) return { error: rowsError.message }
  const members = (rows ?? []) as { employee_id: string; position: number }[]
  const index = members.findIndex((m) => m.employee_id === employeeId)
  if (index === -1) return { error: 'Member not found in group' }
  if (direction === 'up' && index === 0) return { error: 'Already first' }
  if (direction === 'down' && index === members.length - 1) return { error: 'Already last' }
  const neighbourIndex = direction === 'up' ? index - 1 : index + 1
  const member = members[index]
  const neighbour = members[neighbourIndex]
  const { error: upsertError } = await supabaseAdmin
    .from('employee_rotation_group')
    .upsert([
      { rotation_group_id: groupId, employee_id: member.employee_id, position: neighbour.position },
      { rotation_group_id: groupId, employee_id: neighbour.employee_id, position: member.position },
    ])
  if (upsertError) return { error: upsertError.message }
  return { error: null }
}

export async function deleteRotationGroup(id: string): Promise<{ error: string | null }> {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: caller, error: callerError } = await supabaseAdmin
    .from('employee')
    .select('company_id, is_admin')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (callerError) return { error: callerError.message }
  if (!caller) return { error: 'Employee record not found' }
  if (!caller.is_admin) return { error: 'Not authorized' }
  const { data, error } = await supabaseAdmin
    .from('rotation_group')
    .delete()
    .eq('id', id)
    .eq('company_id', caller.company_id)
    .select('id')
  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: 'Rotation group not found' }
  return { error: null }
}
