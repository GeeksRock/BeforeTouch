'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'

interface CompanyForm {
  name: string
}

export async function saveCompany(data: CompanyForm) {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: company, error } = await client
    .from('company')
    .insert([{ name: data.name, owner_id: user.id, state: 'setup' }])
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  redirect(`/setup/employees?company_id=${company.id}`)
}
