// src/lib/offlineQueue.ts
// A tiny localStorage-backed queue for writes made while offline.

export interface QueuedAction {
  id: string
  type: 'add' | 'toggle' | 'delete' | 'update'
  payload: unknown
  createdAt: number
}

const STORAGE_KEY = 'habit-tracker:offline-queue'

function readQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as QueuedAction[]) : []
  } catch {
    return []
  }
}

function writeQueue(queue: QueuedAction[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  } catch {
    // localStorage full or unavailable — silently drop, not critical
  }
}

export function enqueue(action: Omit<QueuedAction, 'id' | 'createdAt'>) {
  const queue = readQueue()
  const entry: QueuedAction = {
    ...action,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  }
  queue.push(entry)
  writeQueue(queue)
  return entry
}

export function getQueue(): QueuedAction[] {
  return readQueue()
}

export function removeFromQueue(id: string) {
  writeQueue(readQueue().filter((a) => a.id !== id))
}

export function clearQueue() {
  writeQueue([])
}