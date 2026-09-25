// src/lib/supabase.ts
//
// Environment adapter. The only module that knows how this build reads config;
// the client itself is built by the framework-free factory in ./supabaseClient.
import { createSupabaseClient } from './supabaseClient'

const url = import.meta.env.VITE_SUPABASE_URL
// The deploy/dashboard name is VITE_SUPABASE_ANON_KEY. PUBLISHABLE_KEY is the
// newer Supabase name for the same credential, kept as a fallback so existing
// local .env files keep working.
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error(
    'Missing Supabase env vars: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env',
  )
}

export const supabase = createSupabaseClient({ url, key })
