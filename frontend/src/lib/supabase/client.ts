'use client'

import { createClient } from '@supabase/supabase-js'

// Browser client — safe to use in client components for Realtime.
export function createSupabaseBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
