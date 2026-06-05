'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function fetchIsAdmin(): Promise<boolean> {
  try {
    const client = await createSupabaseServerClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) return false

    const { data: employee } = await client
      .from('employee')
      .select('is_admin')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    return employee?.is_admin === true
  } catch {
    return false
  }
}
