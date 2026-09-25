import { useEffect, useState, type FormEvent } from 'react'
import TextField from '../components/TextField'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/auth'
import { useHabits, type Habit } from '../hooks/useHabits'
import { AvatarUpload } from '../components/AvatarUpload.tsx'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { BuggyComponent } from '../components/BuggyComponent.tsx'

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

  const handleSignOut = async () => {
    await signOut()
  }

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return
    setAddError(null)
    const { error } = await addHabit({
      title: trimmedTitle,
      category: category.trim() || 'General',
    })
    if (error) setAddError(error)
    else {
      setTitle('')
      setCategory('')
    }
  }

  const handleToggle = async (habit: Habit) => {
    setActionError(null)
    const { error } = await toggleHabit(habit)
    if (error) setActionError(error)
  }

  const handleDelete = async (habit: Habit) => {
    if (!window.confirm(`Delete "${habit.title}"?`)) return
    setActionError(null)
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

  return (
    <div className="min-h-svh bg-slate-100">
      {/* SECTION 1: Header */}
      <ErrorBoundary sectionName="Navigation Header">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
            <h1 className="text-2xl font-bold text-slate-900">Habit Tracker</h1>
            <div className="flex items-center gap-4">
              <span className="hidden text-sm text-slate-500 sm:block">{user?.email}</span>
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
          <BuggyComponent />
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
            <div className="space-y-3">
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

          {loading ? (
            <div className="flex justify-center py-16" role="status">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-indigo-600" />
            </div>
          ) : habits.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-16 text-center text-slate-500">
              No habits yet. Add your first one above.
            </p>
          ) : (
            <ul className="space-y-3">
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
                      <div className="space-y-3">
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
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
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