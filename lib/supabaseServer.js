import { createClient } from '@supabase/supabase-js'

// Lazily create server-side Supabase client using service role key.
// Use `getSupabaseAdmin()` in server handlers so we don't initialize at import time.
const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRole) {
    return null
  }

  return createClient(supabaseUrl, supabaseServiceRole, { auth: { persistSession: false } })
}

export default getSupabaseAdmin
