// mobile/src/lib/supabase.ts
//
// Native adapter. The client itself is the same factory the web app uses
// (../../../src/lib/supabaseClient), with three options changed because a phone
// is not a browser:
//
//   flowType: 'pkce'   The implicit flow returns tokens in a URL fragment, which
//                      a native app cannot receive — the redirect never lands.
//                      PKCE returns to the app:// scheme declared in app.json.
//   detectSessionInUrl: false
//                      There is no address bar to read a hash out of.
//   storage            AsyncStorage, because auth-js's default web storage
//                      adapter is localStorage, which does not exist here.
import 'react-native-url-polyfill/auto'

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createSupabaseClient } from '../../../src/lib/supabaseClient'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const key =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error(
    'Missing Supabase env vars: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env',
  )
}

export const supabase = createSupabaseClient({
  url,
  key,
  flowType: 'pkce',
  detectSessionInUrl: false,
  storage: {
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    removeItem: (key) => AsyncStorage.removeItem(key),
  },
})

export type { Session, User } from '../../../src/lib/supabaseClient'
