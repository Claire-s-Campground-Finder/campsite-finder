import { useState, useMemo } from 'react'
import { Campsite, Filters } from '../types'

const DEFAULT_FILTERS: Filters = {
  search: '',
  type: 'all',
  minRating: 0,
  maxPrice: 300,
  petFriendly: false,
  sortBy: 'rating',
}

export function useFilters(campsites: Campsite[]) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const resetFilters = () => setFilters(DEFAULT_FILTERS)

  const filtered = useMemo(() => {
    let result = campsites.filter((site) => {
      const matchesSearch =
        site.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        site.location.toLowerCase().includes(filters.search.toLowerCase()) ||
        site.description.toLowerCase().includes(filters.search.toLowerCase())

      const matchesType = filters.type === 'all' || site.type === filters.type
      const matchesRating = site.rating >= filters.minRating
      const matchesPrice = site.pricePerNight <= filters.maxPrice
      const matchesPets = !filters.petFriendly || site.petFriendly

      return matchesSearch && matchesType && matchesRating && matchesPrice && matchesPets
    })

    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'rating':
          return b.rating - a.rating
        case 'price-low':
          return a.pricePerNight - b.pricePerNight
        case 'price-high':
          return b.pricePerNight - a.pricePerNight
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

    return result
  }, [campsites, filters])

  const activeFilterCount = [
    filters.search !== '',
    filters.type !== 'all',
    filters.minRating > 0,
    filters.maxPrice < 300,
    filters.petFriendly,
  ].filter(Boolean).length

  return { filters, updateFilter, resetFilters, filtered, activeFilterCount }
}
