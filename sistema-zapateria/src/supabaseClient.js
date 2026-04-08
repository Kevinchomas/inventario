import { createClient } from '@supabase/supabase-js'

// Reemplaza esto con tus datos reales de Supabase (están en Settings > API)
const supabaseUrl = 'https://mtuqsssbdrfungpahkjj.supabase.co'
const supabaseAnonKey = 'sb_publishable_uZwxSNsXJsepn7_BBRZxOw_QIswW4ES'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)