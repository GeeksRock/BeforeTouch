'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { inviteEmployee } from '@/app/setup/employees/actions'

export interface EmployeeRow {
  id: string
  name: string
  contact: string
  can_volunteer: boolean
  can_receive_volunteers: boolean
  is_active: boolean
  auth_user_id: string | null
}

export async function listEmployees(): Promise<{ data: EmployeeRow[] | null; error: string | null }> {
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

  const { data, error } = await supabaseAdmin
    .from('employee')
    .select('id, name, contact, can_volunteer, can_receive_volunteers, is_active, auth_user_id')
    .eq('company_id', caller.company_id)
    .order('name')
  if (error) return { data: null, error: error.message }

  return { data: data ?? [], error: null }
}

type EmployeeUpdates = Partial<Pick<EmployeeRow, 'name' | 'contact' | 'can_volunteer' | 'can_receive_volunteers' | 'is_active'>>

export async function updateEmployee(
  id: string,
  updates: EmployeeUpdates,
): Promise<{ error: string | null }> {
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
  if (updates.is_active === false) {
    if (caller.id === id) return { error: 'You cannot deactivate yourself' }
    const { data: admins } = await supabaseAdmin
      .from('employee')
      .select('id')
      .eq('company_id', caller.company_id)
      .eq('is_admin', true)
      .eq('is_active', true)
    if (admins && admins.length === 1 && admins[0].id === id) {
      return { error: 'Cannot deactivate the last active admin' }
    }
  }
  const { data, error } = await supabaseAdmin
    .from('employee')
    .update(updates)
    .eq('id', id)
    .eq('company_id', caller.company_id)
    .select('id')
  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: 'Employee not found' }
  return { error: null }
}

export interface AddEmployeeForm {
  name: string
  contact: string
  can_volunteer: boolean
  can_receive_volunteers: boolean
  is_active: boolean
}

export async function addEmployee(form: AddEmployeeForm): Promise<{ data: { id: string } | null; error: string | null }> {
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

  const { data, error } = await supabaseAdmin
    .from('employee')
    .insert([{ ...form, company_id: caller.company_id }])
    .select('id')
    .limit(1)
    .maybeSingle()
  if (error) return { data: null, error: error.message }
  if (!data) return { data: null, error: 'Failed to add employee' }

  return { data: { id: data.id }, error: null }
}

export interface BulkEmployeeInput {
  name: string
  contact: string
  can_volunteer: boolean
  can_receive_volunteers: boolean
  is_active: boolean
}

export async function bulkAddEmployees(rows: BulkEmployeeInput[]): Promise<{ data: { count: number } | null; error: string | null }> {
  if (rows.length === 0) return { data: { count: 0 }, error: null }

  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data: company, error: compError } = await supabaseAdmin
    .from('company')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()
  if (compError) return { data: null, error: compError.message }
  if (!company) return { data: null, error: 'No company found for this account' }

  const { error } = await supabaseAdmin
    .from('employee')
    .insert(rows.map(r => ({ ...r, company_id: company.id })))
  if (error) return { data: null, error: error.message }

  return { data: { count: rows.length }, error: null }
}

export interface BulkInviteResult {
  invited: string[]
  failed: { id: string; error: string }[]
}

export async function bulkInviteEmployees(ids: string[]): Promise<BulkInviteResult> {
  const invited: string[] = []
  const failed: { id: string; error: string }[] = []

  for (const id of ids) {
    const { error } = await inviteEmployee(id)
    if (error) {
      failed.push({ id, error })
    } else {
      invited.push(id)
    }
  }
  return { invited, failed }
}

export async function deleteEmployee(id: string): Promise<{ error: string | null }> {
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
  const { data, error } = await supabaseAdmin
    .from('employee')
    .delete()
    .eq('id', id)
    .eq('company_id', caller.company_id)
    .select('id')
  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: 'Employee not found' }
  return { error: null }
}
