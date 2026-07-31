'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'

interface CompanyForm {
  name: string
  ownerName: string
}

export async function saveCompany(data: CompanyForm) {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (!user.email) throw new Error('Authenticated user has no email address')

  const { data: company, error } = await client
    .from('company')
    .insert([{ name: data.name, owner_id: user.id, state: 'setup' }])
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  const { error: employeeError } = await client
    .from('employee')
    .insert([{
      company_id: company.id,
      name: data.ownerName,
      contact: user.email,
      auth_user_id: user.id,
      is_admin: true,
      is_active: true,
      can_volunteer: false,
      can_receive_volunteers: false,
    }])
  if (employeeError) throw new Error(employeeError.message)

  redirect(`/setup/employees?company_id=${company.id}`)
}
