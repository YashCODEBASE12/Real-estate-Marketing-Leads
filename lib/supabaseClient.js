import { createClient } from '@supabase/supabase-js'

const isBrowser = typeof window !== 'undefined'
let supabase = null

export function getSupabaseClient() {
  if (!isBrowser) return null

  if (supabase) return supabase

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      'Supabase client initialization warning: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in Vercel environment variables.'
    )
    return null
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey)
  return supabase
}
