import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import CompanyForm from './company-form'

export default async function SetupPage() {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: employee, error } = await supabaseAdmin
    .from('employee')
    .select('id')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)

  if (employee) redirect('/dashboard/admin')

  return <CompanyForm />
}
