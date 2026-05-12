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
    if (favorites.has(id)) {
      favorites.delete(id)
    } else {
      favorites.add(id)
    }
    setFavorites(favorites)
  }

  const isFavorite = (id: number) => favorites.has(id)

  return { favorites, toggle, isFavorite, count: favorites.size }
}
