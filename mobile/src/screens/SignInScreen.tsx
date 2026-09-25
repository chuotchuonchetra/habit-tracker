// mobile/src/screens/SignInScreen.tsx
// The class strings here are the same ones the web SignIn page uses.
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useAuth } from '../hooks/useAuth'

type Mode = 'signin' | 'signup'

export function SignInScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const handleSubmit = async () => {
    setError(null)
    setNotice(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setError('Email and password are both required.')
      return
    }

    setSubmitting(true)
    const result =
      mode === 'signin' ? await signIn(trimmedEmail, password) : await signUp(trimmedEmail, password)
    setSubmitting(false)

    if ('needsEmailConfirmation' in result && result.needsEmailConfirmation) {
      setNotice('Account created. Check your email to confirm it, then sign in.')
      setMode('signin')
      return
    }
    if (result.error) setError(result.error)
  }

  const inputClass =
    'rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900'

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-100"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-12">
          <Text className="text-3xl font-bold text-slate-900">
            {mode === 'signin' ? 'Sign in' : 'Create your account'}
          </Text>
          <Text className="mt-1 text-base text-slate-500">
            {mode === 'signin'
              ? 'Welcome back to your habits.'
              : 'Start building better habits today.'}
          </Text>

          {error ? (
            <View className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          ) : null}

          {notice ? (
            <View className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <Text className="text-sm text-emerald-700">{notice}</Text>
            </View>
          ) : null}

          <View className="mt-6 gap-4">
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-slate-700">Email</Text>
              <TextInput
                className={inputClass}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
              />
            </View>

            <View className="gap-1.5">
              <Text className="text-sm font-medium text-slate-700">Password</Text>
              <TextInput
                className={inputClass}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                textContentType={mode === 'signin' ? 'password' : 'newPassword'}
                returnKeyType="go"
                onSubmitEditing={() => void handleSubmit()}
              />
            </View>

            <Pressable
              onPress={() => void handleSubmit()}
              disabled={submitting}
              accessibilityRole="button"
              className="mt-2 items-center rounded-lg bg-indigo-600 py-3 active:bg-indigo-500 disabled:opacity-60"
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-base font-medium text-white">
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                </Text>
              )}
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError(null)
              setNotice(null)
            }}
            accessibilityRole="button"
            className="mt-6 items-center"
          >
            <Text className="text-base text-slate-500">
              {mode === 'signin' ? "No account yet? " : 'Already have an account? '}
              <Text className="font-medium text-indigo-600">
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
