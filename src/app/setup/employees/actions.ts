'use server'

import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface EmployeeForm {
  name: string
  contact: string
  can_volunteer: boolean
  can_receive_volunteers: boolean
  company_id: string
  is_active: boolean
}

export async function saveEmployee(data: EmployeeForm) {
  const { error } = await supabase.from('employee').insert([data])
  if (error) throw new Error(error.message)
}

export async function inviteEmployee(employeeId: string, email: string) {
  const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)
  if (inviteError) throw new Error(inviteError.message)

  const authUserId = data.user.id

  const { error: updateError } = await supabase
    .from('employee')
    .update({ auth_user_id: authUserId })
    .eq('id', employeeId)
  if (updateError) throw new Error(updateError.message)
}
