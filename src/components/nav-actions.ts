'use server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { NavRole } from './nav-links'

/** The signed-in person's nav role, or null when nobody is signed in. */
export async function fetchNavRole(): Promise<NavRole | null> {
  try {
    const client = await createSupabaseServerClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) return null
    const { data: employee } = await supabaseAdmin
      .from('employee')
      .select('is_admin')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (!employee) return null
    return employee.is_admin === true ? 'admin' : 'employee'
  } catch {
    return null
  }
}
