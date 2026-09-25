// src/components/UpdateToast.tsx
import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // Optional: poll for updates periodically (every hour)
      if (registration) {
        setInterval(() => {
          void registration.update()
        }, 60 * 60 * 1000)
      }
    },
    onRegisterError(error) {
      console.error('SW registration failed:', error)
    },
  })

  const close = () => {
    setNeedRefresh(false)
    setOfflineReady(false)
  }

  if (!needRefresh && !offlineReady) return null

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
    >
      {needRefresh ? (
        <>
          <p className="text-sm font-medium text-slate-900">New version available</p>
          <p className="mt-1 text-xs text-slate-500">
            Refresh to get the latest version of Habit Tracker.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void updateServiceWorker(true)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Later
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-900">Ready to work offline</p>
          <p className="mt-1 text-xs text-slate-500">
            Habit Tracker has been cached for offline use.
          </p>
          <button
            type="button"
            onClick={close}
            className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Got it
          </button>
        </>
      )}
    </div>
  )
}