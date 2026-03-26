import { useState, useEffect } from 'react'

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<number>>(() => {
    const saved = localStorage.getItem('campsite-favorites')
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })

  useEffect(() => {
    localStorage.setItem('campsite-favorites', JSON.stringify([...favorites]))
  }, [favorites])

  const toggle = (id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const isFavorite = (id: number) => favorites.has(id)

  return { favorites, toggle, isFavorite, count: favorites.size }
}
