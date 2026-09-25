import { useEffect, useRef, useState, type FormEvent } from 'react'
import TextField from '../components/TextField'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/auth'
import { useHabits, type Habit } from '../hooks/useHabits'
import { AvatarUpload } from '../components/AvatarUpload.tsx'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { OfflineBanner } from '../components/OfflineBanner'
import { ShareButton } from '../components/ShareButton'
import { enqueue, getQueue, removeFromQueue, type QueuedAction } from '../lib/offlineQueue'

export default function Habits() {
  const { user, signOut } = useAuth()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const {
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
  } = useHabits(user?.id ?? '')

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Habits queued locally while offline, shown with a "syncing" badge
  // until they're successfully sent once we're back online.
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>(() => getQueue())

  useEffect(() => {
    if (!user?.id) return

    let active = true
    void supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setAvatarUrl(data?.avatar_url ?? null)
      })

    return () => {
      active = false
    }
  }, [user?.id])

  // Sync queued offline actions when the connection comes back.
  // Handlers are read through a ref so the sync always calls the current
  // closures. Registering once with [] is deliberate: a queued action may replay
  // long after sign-out/sign-in, and the mount-time closures would still carry
  // the old userId, so an add would be rejected by RLS and never drain.
  const handlersRef = useRef({ addHabit, setCompleted, deleteHabit, reload })
  useEffect(() => {
    handlersRef.current = { addHabit, setCompleted, deleteHabit, reload }
  })

  useEffect(() => {
    const runSync = async () => {
      const queue = getQueue().sort((a, b) => a.createdAt - b.createdAt)
      if (queue.length === 0) return

      const { addHabit, setCompleted, deleteHabit, reload } = handlersRef.current

      for (const action of queue) {
        try {
          let result: { error: string | null } | undefined

          if (action.type === 'add') {
            result = await addHabit(action.payload as { title: string; category: string })
          } else if (action.type === 'toggle') {
            const { habitId, completed } = action.payload as {
              habitId?: string
              completed?: boolean
            }
            // Drop entries written by an older build that stored the whole habit
            // row; replaying them would issue an unmatched delete every reconnect.
            if (typeof habitId !== 'string' || typeof completed !== 'boolean') {
              removeFromQueue(action.id)
              continue
            }
            result = await setCompleted(habitId, completed)
          } else if (action.type === 'delete') {
            result = await deleteHabit(action.payload as string)
          }

          if (result && !result.error) {
            removeFromQueue(action.id)
          }
          // if it failed, leave it queued — we'll retry on the next reconnect
        } catch {
          // network blip mid-sync, leave it queued
        }
      }

      setQueuedActions(getQueue())
      void reload()
    }

    window.addEventListener('online', runSync)
    if (navigator.onLine) void runSync()

    return () => window.removeEventListener('online', runSync)
  }, [])

  const handleSignOut = async () => {
    await signOut()
  }

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return
    setAddError(null)

    const payload = { title: trimmedTitle, category: category.trim() || 'General' }

    if (!navigator.onLine) {
      // Queue it locally, show it optimistically, sync later.
      enqueue({ type: 'add', payload })
      setQueuedActions(getQueue())
      setTitle('')
      setCategory('')
      return
    }

    const { error } = await addHabit(payload)
    if (error) setAddError(error)
    else {
      setTitle('')
      setCategory('')
    }
  }

  const handleToggle = async (habit: Habit) => {
    setActionError(null)

    if (!navigator.onLine) {
      // Record the state the user wants, not the row as it looked. Replay
      // re-derives from live server state, so a stale snapshot would invert.
      enqueue({
        type: 'toggle',
        payload: { habitId: habit.id, completed: !completedIds.has(habit.id) },
      })
      setQueuedActions(getQueue())
      return
    }

    const { error } = await toggleHabit(habit)
    if (error) setActionError(error)
  }

  const handleDelete = async (habit: Habit) => {
    if (!window.confirm(`Delete "${habit.title}"?`)) return
    setActionError(null)

    if (!navigator.onLine) {
      enqueue({ type: 'delete', payload: habit.id })
      setQueuedActions(getQueue())
      return
    }

    const { error } = await deleteHabit(habit.id)
    if (error) setActionError(error)
  }

  const startEdit = (habit: Habit) => {
    setEditError(null)
    setEditingId(habit.id)
    setEditTitle(habit.title)
    setEditCategory(habit.category)
  }

  const handleSaveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = editTitle.trim()
    if (!trimmedTitle || !editingId) return
    setSavingEdit(true)
    setEditError(null)
    const { error } = await updateHabit(editingId, {
      title: trimmedTitle,
      category: editCategory.trim() || 'General',
    })
    setSavingEdit(false)
    if (error) setEditError(error)
    else setEditingId(null)
  }

  const pendingAddCount = queuedActions.filter((a) => a.type === 'add').length

  return (
    <div className="min-h-svh bg-slate-100">
      <OfflineBanner />

      {/* SECTION 1: Header */}
      <ErrorBoundary sectionName="Navigation Header">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Habit Tracker</h1>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-slate-500 sm:block">{user?.email}</span>
              <ShareButton
                title="Habit Tracker"
                text="Track your daily habits with me"
                url={window.location.origin}
              />
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>
      </ErrorBoundary>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* SECTION 2: Avatar Upload Component */}
        <ErrorBoundary sectionName="Avatar Upload">
          <AvatarUpload
            userId={user?.id ?? ''}
            currentAvatarUrl={avatarUrl ?? ''}
            onUploadComplete={(url) => setAvatarUrl(url)}
          />
        </ErrorBoundary>

        {/* SECTION 3: Add Habit Form */}
        <ErrorBoundary sectionName="Add Habit Form">
          <form
            onSubmit={handleAdd}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Add a habit</h2>
            {addError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {addError}
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                label="Title"
                value={title}
                onChange={setTitle}
                placeholder="e.g. Exercise, Read, Meditate"
                required
              />
              <TextField
                label="Category"
                value={category}
                onChange={setCategory}
                placeholder="General"
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {adding ? 'Adding...' : 'Add habit'}
            </button>
          </form>
        </ErrorBoundary>

        {/* SECTION 4: Habit List */}
        <ErrorBoundary sectionName="Habits List">
          {actionError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </div>
          )}

          {loadError && (
            <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{loadError}</span>
              <button
                type="button"
                onClick={() => void reload()}
                className="shrink-0 font-medium text-red-700 underline hover:text-red-600"
              >
                Retry
              </button>
            </div>
          )}

          {pendingAddCount > 0 && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {pendingAddCount} habit{pendingAddCount > 1 ? 's' : ''} queued offline — will sync
              once you're back online.
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16" role="status">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-indigo-600" />
            </div>
          ) : habits.length === 0 && pendingAddCount === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-16 text-center text-slate-500">
              No habits yet. Add your first one above.
            </p>
          ) : (
            <ul className="space-y-3">
              {queuedActions
                .filter((a) => a.type === 'add')
                .map((a) => {
                  const payload = a.payload as { title: string; category: string }
                  return (
                    <li
                      key={a.id}
                      className="flex items-center gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4"
                    >
                      <span className="h-7 w-7 shrink-0 rounded-full border-2 border-amber-300" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">{payload.title}</p>
                        <span className="mt-0.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Queued — {payload.category}
                        </span>
                      </div>
                    </li>
                  )
                })}

              {habits.map((habit) =>
                editingId === habit.id ? (
                  <li
                    key={habit.id}
                    className="rounded-xl border border-indigo-200 bg-white p-4 shadow-sm"
                  >
                    <form onSubmit={handleSaveEdit}>
                      <h3 className="mb-3 text-sm font-semibold text-slate-900">Edit habit</h3>
                      {editError && (
                        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                          {editError}
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <TextField label="Title" value={editTitle} onChange={setEditTitle} required />
                        <TextField
                          label="Category"
                          value={editCategory}
                          onChange={setEditCategory}
                        />
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          type="submit"
                          disabled={savingEdit}
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingEdit ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          disabled={savingEdit}
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </li>
                ) : (
                  <li
                    key={habit.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void handleToggle(habit)}
                        disabled={pendingId === habit.id}
                        aria-pressed={completedIds.has(habit.id)}
                        aria-label={`Mark ${habit.title} ${completedIds.has(habit.id) ? 'incomplete' : 'complete for today'}`}
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                          completedIds.has(habit.id)
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-300 text-transparent hover:border-indigo-400'
                        }`}
                      >
                        ✓
                      </button>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate font-medium ${
                            completedIds.has(habit.id)
                              ? 'text-slate-400 line-through'
                              : 'text-slate-900'
                          }`}
                        >
                          {habit.title}
                        </p>
                        {habit.category && (
                          <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {habit.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 sm:ml-auto">
                      <button
                        type="button"
                        onClick={() => startEdit(habit)}
                        disabled={pendingId === habit.id}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(habit)}
                        disabled={pendingId === habit.id}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ),
              )}
            </ul>
          )}
        </ErrorBoundary>
      </main>
    </div>
  )
}