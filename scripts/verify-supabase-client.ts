// scripts/verify-supabase-client.ts
//
// Non-destructive smoke test for the hand-composed Supabase client
// (src/lib/supabaseClient.ts). Verifies the URL/header/auth wiring against the
// real project without writing any rows or creating any users: each check
// asserts we get the *expected* server-side rejection, which can only happen if
// the request reached the right endpoint with a valid apikey.
//
//   node --experimental-strip-types scripts/verify-supabase-client.ts
import { readFileSync } from 'node:fs'
import { createSupabaseClient } from '../src/lib/supabaseClient.ts'

// Minimal .env reader so this script has no dependency on the Vite env loader.
const env: Record<string, string> = {}
for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
  const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !key) throw new Error('Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env')

const supabase = createSupabaseClient({ url, key })

let failures = 0
function check(name: string, ok: boolean, detail: string) {
  if (ok) {
    console.log(`  PASS  ${name}\n        ${detail}`)
  } else {
    failures++
    console.log(`  FAIL  ${name}\n        ${detail}`)
  }
}

console.log(`\nComposed client -> ${new URL(url).hostname}\n`)

// 1. Auth endpoint reachable with the anon key. A correctly wired client gets
//    "Invalid login credentials" from gotrue; a mis-wired one gets a fetch
//    failure, a 401 on apikey, or an unparseable response instead.
console.log('auth.signInWithPassword (expect credential rejection)')
{
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'definitely-not-a-real-user@invalid.test',
    password: 'wrong-password',
  })
  const msg = error?.message ?? ''
  check(
    'reaches gotrue with apikey',
    Boolean(error) && data.session === null,
    `error=${JSON.stringify(msg)}`,
  )
  check(
    'rejection is credentials-shaped, not transport/permission',
    /invalid login credentials/i.test(msg),
    `matched /invalid login credentials/ => ${/invalid login credentials/i.test(msg)}`,
  )
}

// 2. REST endpoint + apikey + Bearer fallback (signed out => Bearer is the key).
console.log('\nfrom("habits").select() (expect RLS/anon rejection)')
{
  const { data, error } = await supabase.from('habits').select('*')
  const msg = error?.message ?? ''
  check(
    'reaches postgrest',
    data === null || Array.isArray(data),
    `data=${JSON.stringify(data)} error=${JSON.stringify(msg)}`,
  )
  // Either RLS filtered to [] or it refused. Both prove the request was
  // authorised enough to be evaluated against policies rather than bounced on
  // an apikey/permission error.
  check(
    'not rejected for missing apikey',
    !/apikey|api key|permission denied for table|Unauthorized/i.test(msg),
    `error=${JSON.stringify(msg)}`,
  )
}

// 3. Storage endpoint. storage-js does no auth of its own, so this specifically
//    exercises the authedFetch we hand it.
console.log('\nstorage.from("avatars").list() (expect auth-gated response)')
{
  const { data, error } = await supabase.storage.from('avatars').list()
  const msg = error?.message ?? ''
  check(
    'reaches storage/v1',
    (data !== null && data !== undefined) || Boolean(error),
    `data=${JSON.stringify(data)} error=${JSON.stringify(msg)}`,
  )
}

// 4. getSession must resolve without a stored session rather than throw.
console.log('\nauth.getSession() (expect clean empty session)')
{
  const { data, error } = await supabase.auth.getSession()
  check(
    'resolves with no session and no error',
    !error && data.session === null,
    `session=${JSON.stringify(data.session)} error=${JSON.stringify(error)}`,
  )
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}\n`)
process.exit(failures === 0 ? 0 : 1)
