'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { createSupabaseServerClient } from '@/lib/supabase-server'

interface EmployeeForm {
  name: string
  contact: string
  can_volunteer: boolean
  can_receive_volunteers: boolean
  is_active: boolean
}

export async function saveEmployee(data: EmployeeForm): Promise<{ id: string }> {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: caller } = await supabaseAdmin
    .from('employee')
    .select('id, company_id')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (!caller) throw new Error('Employee record not found')
  const { data: result, error } = await supabaseAdmin
    .from('employee')
    .insert([{ ...data, company_id: caller.company_id }])
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return { id: result.id }
}

export async function inviteEmployee(employeeId: string): Promise<{ error: string | null }> {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: caller } = await supabaseAdmin
    .from('employee')
    .select('id, company_id, is_admin')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (!caller) throw new Error('Employee record not found')
  if (!caller.is_admin) return { error: 'Not authorized' }
  const { data: target } = await supabaseAdmin
    .from('employee')
    .select('id, contact, is_active, auth_user_id')
    .eq('id', employeeId)
    .eq('company_id', caller.company_id)
    .limit(1)
    .maybeSingle()
  if (!target) return { error: 'Employee not found' }
  if (!target.is_active) return { error: 'Employee is inactive' }
  if (!target.contact) return { error: 'Employee has no email' }
  if (target.auth_user_id) return { error: 'Employee already invited' }
  const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    target.contact,
    { redirectTo: 'https://beforetouch.com/set-password' },
  )
  if (inviteError) return { error: inviteError.message }
  const { error: updateError } = await supabaseAdmin
    .from('employee')
    .update({ auth_user_id: invited.user.id })
    .eq('id', employeeId)
  if (updateError) return { error: updateError.message }
  return { error: null }
}
