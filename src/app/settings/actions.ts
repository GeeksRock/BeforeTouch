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
