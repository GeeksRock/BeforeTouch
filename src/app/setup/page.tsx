import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import CompanyForm from './company-form'

export default async function SetupPage() {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: company, error } = await supabaseAdmin
    .from('company')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (error) throw new Error(error.message)

  if (company) redirect('/dashboard/admin')

  return <CompanyForm />
}
