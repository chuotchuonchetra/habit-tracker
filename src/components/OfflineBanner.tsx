// src/components/OfflineBanner.tsx
import { useEffect, useState } from 'react'

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div
      role="status"
      className="w-full bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-800"
    >
      You're offline. Changes will sync when you're back online.
    </div>
  )
}