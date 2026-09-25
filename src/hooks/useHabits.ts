import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/types'

export type Habit = Database['public']['Tables']['habits']['Row']
export type HabitUpdate = Database['public']['Tables']['habits']['Update']

export type ActionResult = { error: string | null }

function todayISO(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function useHabits(userId: string) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      const [habitsRes, logsRes] = await Promise.all([
        supabase.from('habits').select('*').order('created_at', { ascending: true }),
        supabase
          .from('daily_logs')
          .select('habit_id')
          .eq('completed_at', todayISO()),
      ])

      if (cancelled) return
      if (habitsRes.error || logsRes.error) {
        setLoadError(habitsRes.error?.message ?? logsRes.error?.message ?? 'Failed to load habits')
      } else {
        setHabits(habitsRes.data ?? [])
        setCompletedIds(new Set((logsRes.data ?? []).map((log) => log.habit_id)))
      }
      setLoading(false)
    }

    void loadData()

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
      const { data, error } = await supabase
        .from('habits')
        .insert({ title: input.title, category: input.category, user_id: userId })
        .select()
        .single()
      if (!error && data) setHabits((prev) => [...prev, data])
      setAdding(false)
      return { error: error?.message ?? null }
    },
    [userId],
  )

  const updateHabit = useCallback(
    async (id: string, patch: HabitUpdate): Promise<ActionResult> => {
      setPendingId(id)
      const { error } = await supabase.from('habits').update(patch).eq('id', id)
      if (!error) {
        setHabits((prev) => prev.map((habit) => (habit.id === id ? { ...habit, ...patch } : habit)))
      }
      setPendingId(null)
      return { error: error?.message ?? null }
    },
    [],
  )

  const toggleHabit = useCallback(
    async (habit: Habit): Promise<ActionResult> => {
      const today = todayISO()
      setPendingId(habit.id)

      if (completedIds.has(habit.id)) {
        const { error } = await supabase
          .from('daily_logs')
          .delete()
          .eq('habit_id', habit.id)
          .eq('completed_at', today)
        if (!error) {
          setCompletedIds((prev) => {
            const next = new Set(prev)
            next.delete(habit.id)
            return next
          })
        }
        setPendingId(null)
        return { error: error?.message ?? null }
      }

      const { error } = await supabase.from('daily_logs').insert({
        habit_id: habit.id,
        user_id: userId,
        completed_at: today,
      })
      if (!error) {
        setCompletedIds((prev) => {
          const next = new Set(prev)
          next.add(habit.id)
          return next
        })
      }
      setPendingId(null)
      return { error: error?.message ?? null }
    },
    [completedIds, userId],
  )

  const deleteHabit = useCallback(async (id: string): Promise<ActionResult> => {
    setPendingId(id)
    const { error } = await supabase.from('habits').delete().eq('id', id)
    if (!error) {
      setHabits((prev) => prev.filter((habit) => habit.id !== id))
      setCompletedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
    setPendingId(null)
    return { error: error?.message ?? null }
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
    toggleHabit,
    deleteHabit,
  }
}