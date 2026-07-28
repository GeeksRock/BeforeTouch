'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface CompanyForm {
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

export async function saveCompany(data: CompanyForm) {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: company, error } = await client
    .from('company')
    .insert([{ name: data.name, is_active: true, owner_id: user.id }])
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  const { error: rotationGroupError } = await supabaseAdmin
    .from('rotation_group')
    .insert([{
      company_id: company.id,
      name: 'Default',
      rotation_length: data.rotation_length,
      rotation_start_day: data.rotation_start_day,
      rotation_start_time: data.rotation_start_time,
      rotation_end_day: data.rotation_end_day,
      rotation_end_time: data.rotation_end_time,
      has_backup: data.has_backup,
      allowed_volunteer_types: data.allowed_volunteer_types,
      approval_approver: data.approval_approver,
    }])
  if (rotationGroupError) throw new Error(rotationGroupError.message)

  redirect(`/setup/employees?company_id=${company.id}`)
}
