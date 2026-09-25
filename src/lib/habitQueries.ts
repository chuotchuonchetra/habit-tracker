// src/lib/habitQueries.ts
//
// Every Supabase query this app makes, as plain async functions over a client.
// No React, no hooks, no platform APIs — which is the point: the web app and the
// Expo app both call these, so the data half of the habit tracker is written
// once. Only the rendering and the session lifecycle differ per platform.
import type { Database } from './types'
import type { SupabaseClient } from './supabaseClient'

export type Habit = Database['public']['Tables']['habits']['Row']
export type HabitUpdate = Database['public']['Tables']['habits']['Update']
export type ActionResult = { error: string | null }

/**
 * Local calendar date as YYYY-MM-DD. Deliberately not toISOString(), which
 * would shift the day for anyone west of UTC (e.g. 23:30 local in UTC-5 becomes
 * the next day), silently logging completions against the wrong date.
 */
export function todayISO(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export type HabitSnapshot = {
  habits: Habit[]
  completedIds: Set<string>
}

export type LoadResult =
  | { ok: true; snapshot: HabitSnapshot }
  | { ok: false; error: string }

/**
 * Habits plus today's completion set in one round trip pair. RLS scopes both to
 * the signed-in user, so no user id is sent.
 */
export async function loadHabits(
  client: SupabaseClient,
  today: string = todayISO(),
): Promise<LoadResult> {
  const [habitsRes, logsRes] = await Promise.all([
    client.from('habits').select('*').order('created_at', { ascending: true }),
    client.from('daily_logs').select('habit_id').eq('completed_at', today),
  ])

  const error = habitsRes.error ?? logsRes.error
  if (error) return { ok: false, error: error.message }

  return {
    ok: true,
    snapshot: {
      habits: habitsRes.data ?? [],
      completedIds: new Set((logsRes.data ?? []).map((log) => log.habit_id)),
    },
  }
}

export async function insertHabit(
  client: SupabaseClient,
  userId: string,
  input: { title: string; category: string },
): Promise<{ habit: Habit | null } & ActionResult> {
  const { data, error } = await client
    .from('habits')
    .insert({ title: input.title, category: input.category, user_id: userId })
    .select()
    .single()

  return { habit: data ?? null, error: error?.message ?? null }
}

export async function patchHabit(
  client: SupabaseClient,
  id: string,
  patch: HabitUpdate,
): Promise<ActionResult> {
  const { error } = await client.from('habits').update(patch).eq('id', id)
  return { error: error?.message ?? null }
}

export async function removeHabit(client: SupabaseClient, id: string): Promise<ActionResult> {
  const { error } = await client.from('habits').delete().eq('id', id)
  return { error: error?.message ?? null }
}

/**
 * Drives a habit to an explicit desired state rather than flipping whatever the
 * current state happens to be, so a replayed offline action is idempotent: a
 * repeat call for a state already reached is a no-op.
 *
 * `isCompleted` must be the caller's *current* view of the row, read from a ref
 * rather than a render closure, because a queued action can replay long after
 * the render that queued it.
 */
export async function setHabitCompleted(
  client: SupabaseClient,
  userId: string,
  habitId: string,
  completed: boolean,
  options: { today?: string; isCompleted: boolean } ,
): Promise<ActionResult> {
  if (options.isCompleted === completed) return { error: null }

  const today = options.today ?? todayISO()

  if (completed) {
    const { error } = await client.from('daily_logs').insert({
      habit_id: habitId,
      user_id: userId,
      completed_at: today,
    })
    return { error: error?.message ?? null }
  }

  const { error } = await client
    .from('daily_logs')
    .delete()
    .eq('habit_id', habitId)
    .eq('completed_at', today)

  return { error: error?.message ?? null }
}
