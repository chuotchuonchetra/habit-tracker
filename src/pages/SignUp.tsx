import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import LoadingScreen from '../components/LoadingScreen'
import TextField from '../components/TextField'
import { useAuth } from '../context/auth'

export default function SignUp() {
  const { session, loading, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/habits'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)

  useEffect(() => {
    if (session) navigate(from, { replace: true })
  }, [session, from, navigate])

  if (loading) return <LoadingScreen />

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedEmail = email.trim()

    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setSubmitting(true)
    setError(null)
    setNeedsConfirmation(false)
    const { error: signUpError, needsEmailConfirmation } = await signUp(trimmedEmail, password)
    if (signUpError) {
      const isDuplicate = signUpError.toLowerCase().includes('already registered')
      setError(
        isDuplicate ? 'An account with this email already exists. Try a different one.' : signUpError,
      )
    } else if (needsEmailConfirmation) setNeedsConfirmation(true)
    setSubmitting(false)
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
      <p className="mt-1 text-sm text-slate-500">Start building better habits today.</p>

      {needsConfirmation ? (
        <>
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Account created! Check your email to confirm your address before signing in.
          </div>
          <Link
            to="/login"
            className="mt-6 block w-full rounded-lg bg-indigo-600 px-4 py-2 text-center font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Back to login
          </Link>
        </>
      ) : (
        <>
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              minLength={6}
              required
            />
            <TextField
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              minLength={6}
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Creating account...' : 'Sign up'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  )
}