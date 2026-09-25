// mobile/src/hooks/useHabits.ts
//
// The Expo twin of src/hooks/useHabits.ts. The two files differ only in what
// they import and in the handful of offline bits the web app has (the web build
// queues writes to localStorage; there is no equivalent here, so this port is
// online-only and says so rather than pretending otherwise).
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  insertHabit,
  loadHabits,
  patchHabit,
  removeHabit,
  setHabitCompleted,
  todayISO,
  type ActionResult,
  type Habit,
  type HabitUpdate,
} from '../../../src/lib/habitQueries'

export type { ActionResult, Habit, HabitUpdate }
export { todayISO }

export function useHabits(userId: string) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const completedIdsRef = useRef(completedIds)
  useEffect(() => {
    completedIdsRef.current = completedIds
  }, [completedIds])

  useEffect(() => {
    let cancelled = false

    async function run() {
      const result = await loadHabits(supabase)
      if (cancelled) return
      if (result.ok) {
        setHabits(result.snapshot.habits)
        setCompletedIds(result.snapshot.completedIds)
        setLoadError(null)
      } else {
        setLoadError(result.error)
      }
      setLoading(false)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [reloadToken, userId])

  const reload = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    setReloadToken((token) => token + 1)
  }, [])

  const addHabit = useCallback(
    async (input: { title: string; category: string }): Promise<ActionResult> => {
      setAdding(true)
      const { habit, error } = await insertHabit(supabase, userId, input)
      if (!error && habit) setHabits((prev) => [...prev, habit])
      setAdding(false)
      return { error }
    },
    [userId],
  )

  const updateHabit = useCallback(
    async (id: string, patch: HabitUpdate): Promise<ActionResult> => {
      setPendingId(id)
      const { error } = await patchHabit(supabase, id, patch)
      if (!error) {
        setHabits((prev) => prev.map((habit) => (habit.id === id ? { ...habit, ...patch } : habit)))
      }
      setPendingId(null)
      return { error }
    },
    [],
  )

  const setCompleted = useCallback(
    async (habitId: string, completed: boolean): Promise<ActionResult> => {
      setPendingId(habitId)
      const { error } = await setHabitCompleted(supabase, userId, habitId, completed, {
        today: todayISO(),
        isCompleted: completedIdsRef.current.has(habitId),
      })
      if (!error) {
        setCompletedIds((prev) => {
          const next = new Set(prev)
          if (completed) next.add(habitId)
          else next.delete(habitId)
          return next
        })
      }
      setPendingId(null)
      return { error }
    },
    [userId],
  )

  const toggleHabit = useCallback(
    async (habit: Habit): Promise<ActionResult> =>
      setCompleted(habit.id, !completedIds.has(habit.id)),
    [setCompleted, completedIds],
  )

  const deleteHabit = useCallback(async (id: string): Promise<ActionResult> => {
    setPendingId(id)
    const { error } = await removeHabit(supabase, id)
    if (!error) {
      setHabits((prev) => prev.filter((habit) => habit.id !== id))
      setCompletedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
    setPendingId(null)
    return { error }
  }, [])

  return {
    habits,
    completedIds,
    loading,
    loadError,
    adding,
    pendingId,
    reload,
    addHabit,
    updateHabit,
    setCompleted,
    toggleHabit,
    deleteHabit,
  }
}
