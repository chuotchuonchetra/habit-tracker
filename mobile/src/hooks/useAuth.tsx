// mobile/src/hooks/useAuth.ts
//
// Native session lifecycle. This is the other place a phone is not a browser:
// React Native suspends timers when the app is backgrounded, so token refresh
// has to be driven by AppState rather than left to a timer that quietly stops
// firing. Everything else matches the web provider.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createContext, useContext } from 'react'
import { AppState } from 'react-native'
import { supabase, type Session, type User } from '../lib/supabase'

type AuthContextValue = {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    // Foreground => resume the refresh timer, background => stop it. Without
    // this the token silently expires after the app has been backgrounded and
    // the next query fails with a 401 that looks like a bug in the app.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void supabase.auth.startAutoRefresh()
      else supabase.auth.stopAutoRefresh()
    })

    return () => {
      active = false
      appStateSub.remove()
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    return {
      error: error?.message ?? null,
      needsEmailConfirmation: !error && data.session === null,
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, loading, signIn, signUp, signOut }),
    [session, loading, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
