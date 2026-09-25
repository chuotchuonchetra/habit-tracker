// mobile/src/context/HabitsContext.tsx
//
// One habit state, shared by the List and Add screens.
//
// This exists because the two screens are separate routes: without it, Add
// would call its own useHabits and the List would keep its own copy, so a habit
// added on one screen would not appear on the other until a manual refresh. The
// web app gets this for free because List and Add are sections of one route;
// navigation is exactly the thing that makes state sharing a real problem on
// native.
import { createContext, useContext, type ReactNode } from 'react'
import { useHabits } from '../hooks/useHabits'

type HabitsValue = ReturnType<typeof useHabits>

const HabitsContext = createContext<HabitsValue | undefined>(undefined)

export function HabitsProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const value = useHabits(userId)
  return <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>
}

export function useHabitsContext(): HabitsValue {
  const context = useContext(HabitsContext)
  if (!context) throw new Error('useHabitsContext must be used within a HabitsProvider')
  return context
}
