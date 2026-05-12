import { useCallback, useEffect, useState } from 'react'
import type { Campsite } from '../types'

const STORAGE_KEY = 'campsite-view-history'
const MAX_ENTRIES = 6

interface ViewEntry {
  id: number
  viewedAt: number
}

function readHistory(): ViewEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function useRecentlyViewed(campsites: Campsite[]) {
  const [history, setHistory] = useState<ViewEntry[]>(readHistory)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  }, [history])

  const recordView = useCallback((id: number) => {
    setHistory((prev) => {
      const withoutDupe = prev.filter((entry) => entry.id !== id)
      return [{ id, viewedAt: Date.now() }, ...withoutDupe].slice(0, MAX_ENTRIES)
    })
  }, [])

  const clear = useCallback(() => setHistory([]), [])

  const recentlyViewed = history
    .map((entry) => campsites.find((c) => c.id === entry.id))
    .filter((c): c is Campsite => Boolean(c))

  return { recentlyViewed, recordView, clear }
}
