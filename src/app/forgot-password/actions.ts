'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.resetPasswordForEmail(formData.get('email') as string)
  return { error: error ? error.message : null }
}
