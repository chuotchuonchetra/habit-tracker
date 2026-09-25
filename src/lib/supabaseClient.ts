// src/lib/supabaseClient.ts
//
// Composes the three Supabase sub-clients this app actually uses (auth,
// postgrest, storage) instead of importing `@supabase/supabase-js`, whose
// `SupabaseClient` constructor unconditionally instantiates a RealtimeClient and
// exposes a FunctionsClient. This app never calls `.channel()` or
// `.functions.invoke()`, so those two clients plus the Phoenix websocket
// transport ship as dead weight in every route's initial payload.
//
// The auth wiring below is copied from supabase-js's `fetchWithAuth` so request
// behaviour is unchanged: the anon/publishable key is sent as `apikey`, and
// `Authorization` is resolved per request from the live session, falling back to
// the key itself when signed out.
//
// Framework-free on purpose: no React, no DOM, no import.meta.env, so the Expo
// app can call the same factory with a native storage adapter.
import { AuthClient, type Session, type SupportedStorage, type User } from '@supabase/auth-js'
import { PostgrestClient } from '@supabase/postgrest-js'
import { StorageClient } from '@supabase/storage-js'
import type { Database } from './types'

export type { Session, User }

export interface SupabaseClientOptions {
  url: string
  key: string
  /** Token store. Defaults to auth-js's localStorage adapter on web. */
  storage?: SupportedStorage
  /** 'pkce' is required on native, where implicit-flow redirects can't complete. */
  flowType?: 'implicit' | 'pkce'
  autoRefreshToken?: boolean
  persistSession?: boolean
  detectSessionInUrl?: boolean
}

// `from` is taken from the real PostgrestClient rather than re-declared, so its
// overloads and per-table generics stay exactly as upstream defines them.
export type SupabaseClient = PostgrestClient<Database> & {
  auth: InstanceType<typeof AuthClient>
  storage: StorageClient
}

export function createSupabaseClient(options: SupabaseClientOptions): SupabaseClient {
  const { url, key } = options

  if (!url) throw new Error('createSupabaseClient: `url` is required')
  if (!key) throw new Error('createSupabaseClient: `key` is required')

  const base = new URL(url)
  const projectRef = base.hostname.split('.')[0]

  // Same key auth-js uses by default, so sessions persisted by the previous
  // supabase-js build are still found after this swap.
  const storageKey = `sb-${projectRef}-auth-token`

  const auth = new AuthClient({
    url: new URL('auth/v1', base).href,
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    storageKey,
    autoRefreshToken: options.autoRefreshToken ?? true,
    persistSession: options.persistSession ?? true,
    detectSessionInUrl: options.detectSessionInUrl ?? true,
    flowType: options.flowType ?? 'implicit',
    storage: options.storage,
  })

  const authedFetch: typeof fetch = async (input, init) => {
    const { data } = await auth.getSession()
    const token = data.session?.access_token ?? key

    const headers = new Headers(init?.headers)
    if (!headers.has('apikey')) headers.set('apikey', key)
    if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)

    return fetch(input, { ...init, headers })
  }

  const rest = new PostgrestClient<Database>(new URL('rest/v1', base).href, {
    headers: {},
    schema: 'public',
    fetch: authedFetch,
  })

  // storage-js does no auth of its own: BaseApiClient sends the headers it is
  // given through whatever `fetch` it is handed, so authedFetch must be passed.
  const storage = new StorageClient(new URL('storage/v1', base).href, {}, authedFetch)

  return Object.assign(rest, { auth, storage })
}
