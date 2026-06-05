'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'

export interface CompanyForm {
  name: string
  rotation_length: string
  rotation_start_day: string
  rotation_start_time: string
  rotation_end_day: string
  rotation_end_time: string
  has_backup: boolean
  allowed_volunteer_types: string[]
  approval_approver: 'on_call' | 'manager'
}

export async function fetchCompany(): Promise<{ data: CompanyForm | null; error: string | null }> {
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

  const { data: company, error: compError } = await client
    .from('company')
    .select('name, rotation_length, rotation_start_day, rotation_start_time, rotation_end_day, rotation_end_time, has_backup, allowed_volunteer_types, approval_approver')
    .eq('id', employee.company_id)
    .single()
  if (compError) return { data: null, error: compError.message }

  return { data: company as CompanyForm, error: null }
}

export async function updateCompany(data: CompanyForm): Promise<{ error: string | null }> {
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

  const { error: updateError } = await client
    .from('company')
    .update(data)
    .eq('id', employee.company_id)
  if (updateError) return { error: updateError.message }

  return { error: null }
}
