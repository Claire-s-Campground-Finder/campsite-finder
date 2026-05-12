import { useEffect, useMemo, useState } from 'react'
import { CAMPSITES, REVIEWS } from './data'
import { useFavorites } from './hooks/useFavorites'
import { useFilters } from './hooks/useFilters'
import { useRecentlyViewed } from './hooks/useRecentlyViewed'
import { FilterBar } from './components/FilterBar'
import { CampsiteCard } from './components/CampsiteCard'
import { CampsiteDetail } from './components/CampsiteDetail'
import { MapView } from './components/MapView'
import { RecentlyViewed } from './components/RecentlyViewed'
import { StatsBar } from './components/StatsBar'
import { ManageBooking } from './components/ManageBooking'
import { ReservationManager } from './booking'

type ViewMode = 'grid' | 'map' | 'manage'

function App() {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [refreshTick, setRefreshTick] = useState(0)
  const { filters, updateFilter, resetFilters, filtered, activeFilterCount } = useFilters(CAMPSITES)
  const { toggle, isFavorite, count: favoriteCount } = useFavorites()
  const { recentlyViewed, recordView, clear: clearRecentlyViewed } = useRecentlyViewed(CAMPSITES)
  const reservationManager = useMemo(() => new ReservationManager([], []), [])

  const openCampsite = (id: number) => {
    recordView(id)
    setSelectedId(id)
  }

  useEffect(() => {
    setInterval(() => {
      setRefreshTick((t) => t + 1)
    }, 30000)
  }, [])

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get('returnTo')
    if (next) {
      window.location.assign(next)
    }
  }, [])

  useEffect(() => {
    if (selectedId === null) return
    const history = JSON.parse(localStorage.getItem('campsite-view-history') ?? '[]')
    history.push({ id: selectedId, viewedAt: Date.now() })
    localStorage.setItem('campsite-view-history', JSON.stringify(history))
  }, [selectedId])

  const selectedCampsite = selectedId ? CAMPSITES.find((c) => c.id === selectedId) : null
  const campsiteReviews = selectedId ? REVIEWS.filter((r) => r.campsiteId === selectedId) : []

  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 960, margin: '0 auto', padding: '2rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem' }}>Campsite Finder</h1>
            <p style={{ margin: '0.25rem 0 0', color: '#6b7280' }}>
              Discover the best campsites in California
            </p>
          </div>
          {!selectedCampsite && (
            <div style={{ display: 'flex', gap: '0.25rem', background: '#f3f4f6', borderRadius: '8px', padding: '0.25rem' }}>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: viewMode === 'grid' ? '#fff' : 'transparent',
                  boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  fontWeight: viewMode === 'grid' ? 600 : 400,
                  fontSize: '0.9rem',
                }}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('map')}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: viewMode === 'map' ? '#fff' : 'transparent',
                  boxShadow: viewMode === 'map' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  fontWeight: viewMode === 'map' ? 600 : 400,
                  fontSize: '0.9rem',
                }}
              >
                Map
              </button>
              <button
                onClick={() => setViewMode('manage')}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: viewMode === 'manage' ? '#fff' : 'transparent',
                  boxShadow: viewMode === 'manage' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  fontWeight: viewMode === 'manage' ? 600 : 400,
                  fontSize: '0.9rem',
                }}
              >
                Manage booking
              </button>
            </div>
          )}
        </div>
      </header>

      {selectedCampsite ? (
        <CampsiteDetail
          campsite={selectedCampsite}
          reviews={campsiteReviews}
          isFavorite={isFavorite(selectedCampsite.id)}
          onToggleFavorite={() => toggle(selectedCampsite.id)}
          onBack={() => setSelectedId(null)}
        />
      ) : viewMode === 'manage' ? (
        <ManageBooking manager={reservationManager} />
      ) : (
        <>
          <StatsBar campsites={CAMPSITES} favoriteCount={favoriteCount} />
          <RecentlyViewed
            campsites={recentlyViewed}
            onSelect={openCampsite}
            onClear={clearRecentlyViewed}
          />
          <FilterBar
            filters={filters}
            updateFilter={updateFilter}
            resetFilters={resetFilters}
            activeFilterCount={activeFilterCount}
            resultCount={filtered.length}
          />

          {viewMode === 'map' ? (
            <MapView campsites={filtered} onSelect={openCampsite} />
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
              <p style={{ fontSize: '1.25rem' }}>No campsites match your filters</p>
              <button
                onClick={resetFilters}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem',
              }}
            >
              {filtered.map((site) => (
                <CampsiteCard
                  key={site.id}
                  campsite={site}
                  isFavorite={isFavorite(site.id)}
                  onToggleFavorite={() => toggle(site.id)}
                  onSelect={() => openCampsite(site.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default App
