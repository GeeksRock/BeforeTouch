'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'

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
    .insert([{ ...data, owner_id: user.id }])
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  redirect(`/setup/employees?company_id=${company.id}`)
}
