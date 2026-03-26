import { Filters } from '../types'

interface FilterBarProps {
  filters: Filters
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void
  resetFilters: () => void
  activeFilterCount: number
  resultCount: number
}

export function FilterBar({ filters, updateFilter, resetFilters, activeFilterCount, resultCount }: FilterBarProps) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search campsites..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          style={{
            flex: 1,
            minWidth: 200,
            padding: '0.6rem 1rem',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '0.95rem',
            outline: 'none',
          }}
        />
        <select
          value={filters.type}
          onChange={(e) => updateFilter('type', e.target.value)}
          style={selectStyle}
        >
          <option value="all">All Types</option>
          <option value="tent">Tent</option>
          <option value="rv">RV</option>
          <option value="cabin">Cabin</option>
          <option value="glamping">Glamping</option>
        </select>
        <select
          value={filters.sortBy}
          onChange={(e) => updateFilter('sortBy', e.target.value as Filters['sortBy'])}
          style={selectStyle}
        >
          <option value="rating">Top Rated</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          Min Rating:
          <select
            value={filters.minRating}
            onChange={(e) => updateFilter('minRating', Number(e.target.value))}
            style={{ ...selectStyle, width: 'auto' }}
          >
            <option value={0}>Any</option>
            <option value={3}>3+</option>
            <option value={4}>4+</option>
            <option value={4.5}>4.5+</option>
          </select>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          Max Price:
          <input
            type="range"
            min={10}
            max={300}
            step={5}
            value={filters.maxPrice}
            onChange={(e) => updateFilter('maxPrice', Number(e.target.value))}
            style={{ width: 120 }}
          />
          <span style={{ minWidth: 50 }}>${filters.maxPrice}</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={filters.petFriendly}
            onChange={(e) => updateFilter('petFriendly', e.target.checked)}
          />
          Pet Friendly
        </label>

        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            style={{
              background: 'none',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '0.3rem 0.8rem',
              fontSize: '0.85rem',
              cursor: 'pointer',
              color: '#6b7280',
            }}
          >
            Clear filters ({activeFilterCount})
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#9ca3af' }}>
          {resultCount} campsite{resultCount !== 1 ? 's' : ''} found
        </span>
      </div>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  padding: '0.6rem 0.8rem',
  borderRadius: '8px',
  border: '1px solid #d1d5db',
  fontSize: '0.95rem',
  background: '#fff',
  cursor: 'pointer',
}
