import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mbruurmsvjhudyzkblwm.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_os_oYDt4Py-88eoS9QTMFA_a4zi1jXy'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
