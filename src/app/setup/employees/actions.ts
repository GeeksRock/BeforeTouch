'use server'

import { supabase } from '@/lib/supabase'

interface EmployeeForm {
  name: string
  contact: string
  can_volunteer: boolean
  can_receive_volunteers: boolean
  company_id: string
}

export async function saveEmployee(data: EmployeeForm) {
  const { error } = await supabase.from('employee').insert([data])
  if (error) throw new Error(error.message)
}
