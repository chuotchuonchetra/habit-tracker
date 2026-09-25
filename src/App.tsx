import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthProvider'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import { UpdateToast } from './components/UpdateToast'
import { OfflineBanner } from './components/OfflineBanner'
import { lazy, Suspense } from 'react'
const Habits = lazy(() => import('./pages/Habits'))
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/habits" replace />} />
          <Route path="/login" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route element={<ProtectedRoute />}>
            <Route
              path="/habits"
              element={
                <Suspense fallback={<div className="p-6 text-center">Loading…</div>}>
                  <Habits />
                </Suspense>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
      <UpdateToast />
      <OfflineBanner />
    </BrowserRouter>
  )
}