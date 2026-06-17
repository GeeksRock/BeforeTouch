'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface EmployeeRow {
  id: string
  name: string
  contact: string
  can_volunteer: boolean
  can_receive_volunteers: boolean
  is_active: boolean
}

export async function listEmployees(): Promise<{ data: EmployeeRow[] | null; error: string | null }> {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data: company, error: compError } = await client
    .from('company')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()
  if (compError) return { data: null, error: compError.message }
  if (!company) return { data: null, error: 'No company found for this account' }

  const { data, error } = await client
    .from('employee')
    .select('id, name, contact, can_volunteer, can_receive_volunteers, is_active')
    .eq('company_id', company.id)
    .order('name')
  if (error) return { data: null, error: error.message }

  return { data: data ?? [], error: null }
}

type EmployeeUpdates = Partial<Pick<EmployeeRow, 'name' | 'contact' | 'can_volunteer' | 'can_receive_volunteers' | 'is_active'>>

export async function updateEmployee(
  id: string,
  updates: EmployeeUpdates,
): Promise<{ error: string | null }> {
  const { error } = await supabaseAdmin.from('employee').update(updates).eq('id', id)
  if (error) return { error: error.message }
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

  const { data: company, error: compError } = await client
    .from('company')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()
  if (compError) return { data: null, error: compError.message }
  if (!company) return { data: null, error: 'No company found for this account' }

  const { data, error } = await supabaseAdmin
    .from('employee')
    .insert([{ ...form, company_id: company.id }])
    .select('id')
    .limit(1)
    .maybeSingle()
  if (error) return { data: null, error: error.message }
  if (!data) return { data: null, error: 'Failed to add employee' }

  return { data: { id: data.id }, error: null }
}
