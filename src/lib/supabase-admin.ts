import { createClient } from '@supabase/supabase-js'

let supabaseAdmin: ReturnType<typeof createClient> | null = null

export function getSupabaseAdmin() {
  // Return cached client if already created
  if (supabaseAdmin) {
    return supabaseAdmin
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      `Missing required environment variables. ` +
      `supabaseUrl: ${!!supabaseUrl}, ` +
      `supabaseServiceKey: ${!!supabaseServiceKey}`
    )
  }

  // Create and cache the client
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  return supabaseAdmin
}