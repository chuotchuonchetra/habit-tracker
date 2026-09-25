import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth'
import LoadingScreen from './LoadingScreen'

export default function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}