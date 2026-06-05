'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'

export interface ProfileForm {
  name: string
  contact: string
}

export async function fetchProfile(): Promise<{ data: ProfileForm | null; error: string | null }> {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data: employee, error: empError } = await client
    .from('employee')
    .select('name, contact')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (empError) return { data: null, error: empError.message }
  if (!employee) return { data: null, error: 'Employee record not found' }

  return { data: employee as ProfileForm, error: null }
}

export async function updateProfile(data: ProfileForm): Promise<{ error: string | null }> {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error: updateError } = await client
    .from('employee')
    .update(data)
    .eq('auth_user_id', user.id)
  if (updateError) return { error: updateError.message }

  return { error: null }
}
