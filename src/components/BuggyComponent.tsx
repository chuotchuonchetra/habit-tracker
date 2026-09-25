// src/components/BuggyComponent.tsx
import { useState } from 'react'

export function BuggyComponent() {
  const [crash, setCrash] = useState(false)

  if (crash) {
    // This uncaught error will trigger the nearest parent ErrorBoundary
    throw new Error('Simulated runtime crash!')
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-4">
      <p className="text-sm font-medium text-amber-900 mb-2">
        Test Area: Simulating Component Crash
      </p>
      <button
        type="button"
        onClick={() => setCrash(true)}
        className="rounded bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
      >
        Trigger Component Crash
      </button>
    </div>
  )
}