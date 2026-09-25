import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthProvider'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import { UpdateToast } from './components/UpdateToast'
import { OfflineBanner } from './components/OfflineBanner'
import { lazy, Suspense } from 'react'
import LoadingScreen from './components/LoadingScreen'

// Hand-written split decision — see docs/performance-pass.md.
// /habits is the only route reachable after auth and it is where essentially
// all app code lives (useHabits, the offline queue sync, avatar upload, the
// whole list UI). It is also the route a returning user lands on, so it is the
// one that must be in the entry's critical path. The two auth pages are
// smaller than the router that renders them, so splitting them would add a
// waterfall to the signed-out first paint to save a couple of kilobytes.
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
                <Suspense fallback={<LoadingScreen />}>
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